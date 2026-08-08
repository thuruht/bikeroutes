import { Hono } from "hono";
import type { Context } from "hono";
import { getCurrentUser, isModerator } from "../lib/auth";
import { logger } from "../lib/logger";
import { createNotification } from "../lib/notifications";

export const communityRoutes = new Hono<{ Bindings: Env }>();

const PUBLIC_POST_FIELDS = `
  p.id, p.user_id, p.title, p.body, p.category, p.lat, p.lon,
  p.status, p.score, p.like_count, p.comment_count, p.created_at, p.updated_at,
  u.display_name, u.username, u.avatar_url
`;

type Authorable = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  category: string;
  lat: number | null;
  lon: number | null;
  status: string;
  score: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
} & Authorable;

function uuidv4(): string {
  return crypto.randomUUID();
}

function sanitizeString(input: unknown, maxLength: number): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

async function getMediaRows(
  db: D1Database,
  postIds: string[]
): Promise<Map<string, { key: string; r2Key: string; contentType: string; fileName: string }[]>> {
  const map = new Map<string, { key: string; r2Key: string; contentType: string; fileName: string }[]>();
  if (postIds.length === 0) return map;
  const placeholders = postIds.map(() => "?").join(",");
  const rows = await db.prepare(
    `SELECT id, post_id, r2_key, content_type, file_name FROM community_post_media \n     WHERE post_id IN (${placeholders}) ORDER BY sort_order, created_at`
  ).bind(...postIds).all<{ id: string; post_id: string; r2_key: string; content_type: string; file_name: string }>();

  for (const r of rows.results ?? []) {
    const list = map.get(r.post_id) ?? [];
    list.push({
      key: r.id,
      r2Key: r.r2_key,
      contentType: r.content_type,
      fileName: r.file_name,
    });
    map.set(r.post_id, list);
  }
  return map;
}

function serializePost(row: PostRow, mediaMap: Map<string, any>) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    category: row.category,
    lat: row.lat,
    lon: row.lon,
    status: row.status,
    score: row.score,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
    },
    media: mediaMap.get(row.id)?.map((m: any) => ({
      key: m.key,
      url: `/api/community/media/${encodeURIComponent(m.r2Key)}`,
      contentType: m.contentType,
      fileName: m.fileName,
    })) ?? [],
  };
}

// ─── List / search posts ──────────────────────────────────────────
communityRoutes.get("/posts", async (c) => {
  const db = c.env.DB;
  const { searchParams } = new URL(c.req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") ?? "new";
  const userId = searchParams.get("userId");

  let whereParts = ["p.status = 'active'"];
  const params: (string | number)[] = [];

  if (category) {
    whereParts.push("p.category = ?");
    params.push(category);
  }
  if (userId) {
    whereParts.push("p.user_id = ?");
    params.push(userId);
  }
  if (q) {
    const term = q.trim();
    if (term.length > 0) {
      whereParts.push("p.id IN (SELECT rowid FROM community_posts_search WHERE community_posts_search MATCH ?)");
      params.push(term + "*");
    }
  }

  const bbox = searchParams.get("bbox");
  if (bbox) {
    const [south, west, north, east] = bbox.split(",").map(parseFloat);
    if ([south, west, north, east].every(n => !Number.isNaN(n))) {
      whereParts.push("p.lat BETWEEN ? AND ? AND p.lon BETWEEN ? AND ?");
      params.push(south, north, west, east);
    }
  }

  const orderBy = sort === "top" ? "p.score DESC, p.created_at DESC" : "p.created_at DESC";
  const sql = `SELECT ${PUBLIC_POST_FIELDS} FROM community_posts p \n                   LEFT JOIN users u ON u.id = p.user_id \n                   WHERE ${whereParts.join(" AND ")} \n                   ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const { results } = await db.prepare(sql).bind(...params).all<PostRow>();
    const ids = results?.map(r => r.id) ?? [];
    const mediaMap = await getMediaRows(db, ids);
    const posts = results?.map(r => serializePost(r, mediaMap)) ?? [];

    const totalRow = await db.prepare(
      `SELECT COUNT(*) as total FROM community_posts p WHERE ${whereParts.join(" AND ")}`
    ).bind(...params.slice(0, -2)).first<{ total: number }>();

    return c.json({ posts, total: totalRow?.total ?? 0, limit, offset });
  } catch (error) {
    logger.error("Failed to list community posts", error, "COMMUNITY");
    return c.json({ error: "Failed to load posts" }, 500);
  }
});

// ─── Get single post ──────────────────────────────────────────────
communityRoutes.get("/posts/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const row = await db.prepare(
    `SELECT ${PUBLIC_POST_FIELDS} FROM community_posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ?`
  ).bind(id).first<PostRow>();

  if (!row) return c.json({ error: "Post not found" }, 404);
  const mediaMap = await getMediaRows(db, [id]);

  const comments = await db.prepare(
    `SELECT c.id, c.user_id, c.author_name, c.body, c.created_at, \n            u.display_name, u.username, u.avatar_url \n     FROM community_post_comments c \n     LEFT JOIN users u ON u.id = c.user_id \n     WHERE c.post_id = ? ORDER BY c.created_at DESC LIMIT 50`
  ).bind(id).all<{ id: string; user_id: string | null; author_name: string | null; body: string; created_at: string; display_name: string | null; username: string | null; avatar_url: string | null }>();

  const likedByMe = await isLikedByMe(c, id);

  return c.json({
    post: serializePost(row, mediaMap),
    comments: comments.results?.map(r => ({
      id: r.id,
      userId: r.user_id,
      author: {
        displayName: r.display_name ?? r.author_name ?? "Anonymous",
        username: r.username,
        avatarUrl: r.avatar_url,
      },
      body: r.body,
      createdAt: r.created_at,
    })) ?? [],
    likedByMe,
  });
});

// ─── Create post ──────────────────────────────────────────────────
communityRoutes.post("/posts", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Sign in to post" }, 401);

  const body = await c.req.json<{
    title?: string;
    body?: string;
    category?: string;
    lat?: number;
    lon?: number;
    mediaKeys?: string[];
  }>();

  const postBody = sanitizeString(body.body, 4000);
  if (!postBody) return c.json({ error: "Body is required" }, 400);

  const title = sanitizeString(body.title, 140);
  const category = sanitizeString(body.category, 50) ?? "general";
  const validCategories = ["general", "report", "mud", "wildlife", "flooding", "hazard", "photo", "route", "meetup", "gear", "question"];
  const finalCategory = validCategories.includes(category) ? category : "general";

  const id = uuidv4();
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lon = typeof body.lon === "number" ? body.lon : null;

  try {
    await c.env.DB.prepare(
      `INSERT INTO community_posts (id, user_id, title, body, category, lat, lon, score) \n       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(id, user.id, title, postBody, finalCategory, lat, lon).run();

    if (body.mediaKeys?.length) {
      for (let i = 0; i < body.mediaKeys.length; i++) {
        await c.env.DB.prepare(
          `UPDATE community_post_media SET post_id = ?, sort_order = ? WHERE id = ? AND user_id = ?`
        ).bind(id, i, body.mediaKeys[i], user.id).run();
      }
    }

    return c.json({ post: { id, title, body: postBody, category: finalCategory, lat, lon, createdAt: new Date().toISOString() } }, 201);
  } catch (error) {
    logger.error("Failed to create community post", error, "COMMUNITY");
    return c.json({ error: "Failed to create post" }, 500);
  }
});

// ─── Delete post ────────────────────────────────────────────────────
communityRoutes.delete("/posts/:id", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const post = await c.env.DB.prepare("SELECT user_id FROM community_posts WHERE id = ?").bind(id).first<{ user_id: string }>();
  if (!post) return c.json({ error: "Post not found" }, 404);
  if (post.user_id !== user.id && !isModerator(user)) return c.json({ error: "Forbidden" }, 403);

  try {
    await c.env.DB.prepare("DELETE FROM community_posts WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete post", error, "COMMUNITY");
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

// ─── Like / unlike ──────────────────────────────────────────────────
async function isLikedByMe(c: Context<{ Bindings: Env }>, postId: string): Promise<boolean> {
  const user = await getCurrentUser(c);
  if (!user) return false;
  const like = await c.env.DB.prepare("SELECT 1 FROM community_post_likes WHERE post_id = ? AND user_id = ?").bind(postId, user.id).first();
  return !!like;
}

communityRoutes.post("/posts/:id/like", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Sign in to like" }, 401);
  const postId = c.req.param("id");

  try {
    await c.env.DB.prepare("INSERT OR IGNORE INTO community_post_likes (id, post_id, user_id) VALUES (?, ?, ?)").bind(uuidv4(), postId, user.id).run();
    await c.env.DB.prepare(
      `UPDATE community_posts SET like_count = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = ?), \n                                     score = like_count * 1.0 + comment_count * 2.0 + strftime('%s', created_at) / 86400.0 \n       WHERE id = ?`
    ).bind(postId, postId).run();
    return c.json({ success: true });
  } catch (error) {
    logger.error("Failed to like post", error, "COMMUNITY");
    return c.json({ error: "Failed to like" }, 500);
  }
});

communityRoutes.post("/posts/:id/unlike", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Sign in" }, 401);
  const postId = c.req.param("id");

  try {
    await c.env.DB.prepare("DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?").bind(postId, user.id).run();
    await c.env.DB.prepare(
      `UPDATE community_posts SET like_count = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = ?), \n                                     score = like_count * 1.0 + comment_count * 2.0 + strftime('%s', created_at) / 86400.0 \n       WHERE id = ?`
    ).bind(postId, postId).run();
    return c.json({ success: true });
  } catch (error) {
    logger.error("Failed to unlike post", error, "COMMUNITY");
    return c.json({ error: "Failed to unlike" }, 500);
  }
});

// ─── Comment ────────────────────────────────────────────────────────
communityRoutes.post("/posts/:id/comment", async (c) => {
  const user = await getCurrentUser(c);
  const postId = c.req.param("id");
  const { body, anonymous } = await c.req.json<{ body?: string; anonymous?: boolean }>();
  const text = sanitizeString(body, 2000);
  if (!text) return c.json({ error: "Comment body required" }, 400);

  try {
    const id = uuidv4();
    await c.env.DB.prepare(
      "INSERT INTO community_post_comments (id, post_id, user_id, author_name, body) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, postId, user?.id ?? null, user && !anonymous ? user.display_name : null, text).run();
    await c.env.DB.prepare(
      `UPDATE community_posts SET comment_count = (SELECT COUNT(*) FROM community_post_comments WHERE post_id = ?), \n                                      score = like_count * 1.0 + comment_count * 2.0 + strftime('%s', created_at) / 86400.0 \n       WHERE id = ?`
    ).bind(postId, postId).run();

    // Notify post author (not self)
    const post = await c.env.DB.prepare("SELECT user_id, title FROM community_posts WHERE id = ?").bind(postId).first<{ user_id: string; title: string | null }>();
    if (post && post.user_id && post.user_id !== user?.id) {
      await createNotification(c.env.DB, {
        user_id: post.user_id,
        type: "comment",
        title: "New comment on your post",
        body: `${user?.display_name || user?.username || "Someone"} commented: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
        link: `/community/post/${postId}`,
      });
    }

    return c.json({ comment: { id, body: text, createdAt: new Date().toISOString() } }, 201);
  } catch (error) {
    logger.error("Failed to add comment", error, "COMMUNITY");
    return c.json({ error: "Failed to comment" }, 500);
  }
});

// ─── Upload media ───────────────────────────────────────────────────
communityRoutes.post("/media", async (c) => {
  const user = await getCurrentUser(c);
  if (!user) return c.json({ error: "Sign in to upload" }, 401);

  let body: ArrayBuffer | null = null;
  let fileName = "upload";
  let contentType = "application/octet-stream";

  const contentTypeHeader = c.req.header("content-type") ?? "";
  if (contentTypeHeader.includes("multipart/form-data")) {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return c.json({ error: "No file" }, 400);
    body = await file.arrayBuffer();
    fileName = file.name;
    contentType = file.type || "application/octet-stream";
  } else {
    body = await c.req.arrayBuffer();
    fileName = c.req.header("x-file-name") ?? "upload";
    contentType = contentTypeHeader || "application/octet-stream";
  }

  if (!body || body.byteLength === 0) return c.json({ error: "Empty file" }, 400);
  if (body.byteLength > 8 * 1024 * 1024) return c.json({ error: "File too large (max 8MB)" }, 413);

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowedExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov"]);
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"]);
  if (!allowedExts.has(ext) && !allowedTypes.has(contentType)) {
    return c.json({ error: "Unsupported file type. Images and short videos only." }, 415);
  }

  const key = `community/${user.id}/${uuidv4()}.${ext || "bin"}`;
  try {
    await c.env.R2_ASSETS.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { userId: user.id, fileName },
    });

    const id = uuidv4();
    await c.env.DB.prepare(
      "INSERT INTO community_post_media (id, user_id, r2_key, content_type, file_name) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, user.id, key, contentType, fileName).run();

    return c.json({ success: true, key: id, url: `/api/community/media/${encodeURIComponent(key)}`, fileName, contentType });
  } catch (error) {
    logger.error("Failed to upload community media", error, "COMMUNITY");
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Serve media ────────────────────────────────────────────────────
communityRoutes.get("/media/*", async (c) => {
  const key = decodeURIComponent(c.req.param("*") ?? "");
  try {
    const obj = await c.env.R2_ASSETS.get(key);
    if (!obj) return c.json({ error: "Not found" }, 404);

    const headers = new Headers();
    headers.set("Content-Type", obj.httpMetadata?.contentType ?? "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (obj.size) headers.set("Content-Length", obj.size.toString());
    return new Response(obj.body, { headers });
  } catch (error) {
    logger.error("Failed to serve community media", error, "COMMUNITY");
    return c.json({ error: "Failed to serve media" }, 500);
  }
});
