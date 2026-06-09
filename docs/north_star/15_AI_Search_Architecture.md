# 15. Semantic Trail Search & AI Architecture

This document details the technical implementation of the semantic search engine on BikeRoutes.org, leveraging Cloudflare Workers AI and Vectorize.

## 1. Architectural Overview

The search system shifts from traditional keyword matching to **Semantic Understanding**. It allows users to search by intent (e.g., "quiet nature paths") rather than exact names.

### The Stack
*   **Embedding Model:** `@cf/baai/bge-base-en-v1.5` (768 dimensions)
*   **Vector Database:** Cloudflare Vectorize (`TRAIL_SEARCH`)
*   **Mascot LLM:** `@cf/meta/llama-3-8b-instruct`
*   **Rate Limiting:** KV-based Token Bucket (10 req/min)

## 2. Request Lifecycle

When a user submits a search query via `GET /api/search?q=...`, the following sequence occurs:

### A. Pre-Processing & Security
1.  **Length Check:** Queries must be ≥ 3 characters.
2.  **Rate Limit:** The `checkRateLimit` helper (in `search.ts`) checks the `RATE_LIMITS` KV namespace using the user's IP. A token bucket algorithm ensures fair usage and protects AI resource credits.

### B. Meaning-to-Math (Embedding)
The Worker sends the query text to Workers AI. The model returns a 768-dimension floating-point array (vector). This vector represents the "semantic space" of the query.

### C. The Vector Probe
The generated vector is sent to the `TRAIL_SEARCH` index. Vectorize performs a cosine similarity search against pre-indexed trails and returns the top 5 matches, including their metadata (ID, Name, Description).

### D. Reki's Persona Synthesis
If matches are found, the Worker constructs a context-rich prompt for Llama 3:
1.  **Context:** The names and descriptions of the top 5 matches.
2.  **System Prompt:** Defines Reki's persona (helpful scout deer, uses nature puns, short responses).
3.  **Result:** Reki "explains" why these paths were chosen, creating an empathetic user experience.

## 3. Analytics & Feedback Loop

Every search is logged anonymously to the D1 `search_logs` table:
*   **Query:** The literal string searched.
*   **Result Count:** How many matches Vectorize found.
*   **IP Hash:** A truncated SHA-256 hash for unique user tracking without PII.

This data allows stewards to identify "dead zones" where users are searching for trails that haven't been scouted yet.

## 4. Indexing Strategy (Internal)

To maintain the index, the project uses a separate ingestion script (found in `scripts/index-trails.ts` - *TBD*) that:
1.  Reads GeoJSON trails from R2/D1.
2.  Generates embeddings for each trail's name + description.
3.  Upserts the vectors to Vectorize with `metadata` containing the trail's primary ID.

## 5. Implementation Reference
*   **Main Logic:** `worker/src/routes/search.ts`
*   **Rate Limiter:** `checkRateLimit()` in `search.ts`
*   **Schema:** `search_logs` in `worker/migrations/0001_initial_schema.sql`
