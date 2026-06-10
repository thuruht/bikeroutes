/* Design System page — renders swatches, scales, favicons; theme toggle.
   Pure vanilla; no deps. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- theme toggle ---------- */
  const root = document.documentElement;
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    $("#t-dark").classList.toggle("active", t === "dark");
    $("#t-light").classList.toggle("active", t === "light");
    try { localStorage.setItem("br-ds-theme", t); } catch (e) {}
    renderSemantic(); renderContrast();
  }
  $("#t-dark").addEventListener("click", () => setTheme("dark"));
  $("#t-light").addEventListener("click", () => setTheme("light"));

  /* ---------- 1. brand palette ---------- */
  const BRAND = [
    ["Deer Brown", "#C0763C", "--brand-deer-brown", "Reki body · warm headers"],
    ["Blaze Orange", "#FF6B1A", "--brand-blaze-orange", "Primary accent · CTA · safety"],
    ["Camo Olive", "#4B5320", "--brand-camo-olive", "Tactical surfaces · secondary bg"],
    ["Cream White", "#FFF5E6", "--brand-cream-white", "Primary text on dark · chest/tail"],
    ["Forest Green", "#2D5F3A", "--brand-forest-green", "Cap · bag · accent buttons"],
    ["Trail Tan", "#D4A96A", "--brand-trail-tan", "Card surfaces · secondary bg"],
    ["Dark Hoof", "#0B0C08", "--brand-dark-hoof", "Deep dark base · ink · outlines"],
    ["Sky Blue", "#6BAED6", "--brand-sky-blue", "Links · interactive · map water"],
  ];
  const brandWrap = $("#brand-sw");
  BRAND.forEach(([nm, hex, tok, use]) => {
    const c = el("div", "sw");
    c.appendChild(el("span", "chip")).style.background = hex;
    const m = el("div", "meta");
    m.appendChild(el("div", "nm", nm));
    m.appendChild(el("div", "hex", hex));
    m.appendChild(el("div", "use", use));
    m.appendChild(el("div", "tok", tok));
    c.appendChild(m);
    brandWrap.appendChild(c);
  });

  /* ---------- 2. semantic tokens (live, current theme) ---------- */
  const SEM = ["--paper", "--paper-2", "--panel-solid", "--ink", "--ink-2", "--muted-txt",
    "--line", "--line-2", "--green", "--green-deep", "--green-soft",
    "--orange", "--orange-soft", "--link", "--danger", "--success"];
  function renderSemantic() {
    const w = $("#sem-sw"); w.innerHTML = "";
    SEM.forEach((tok) => {
      const cell = el("div", "tok-cell");
      const dot = el("div", "dot"); dot.style.background = `var(${tok})`;
      cell.appendChild(dot);
      cell.appendChild(el("div", "nm", tok + "<br>" + (cssVar(tok) || "")));
      w.appendChild(cell);
    });
  }

  /* ---------- contrast ---------- */
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lum([r, g, b]) {
    const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function ratio(fg, bg) {
    const L1 = lum(hexToRgb(fg)), L2 = lum(hexToRgb(bg));
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function renderContrast() {
    const w = $("#contrast"); w.innerHTML = "";
    const pairs = [
      ["Body text", "--ink", "--paper"],
      ["Secondary", "--ink-2", "--paper"],
      ["Link", "--link", "--paper"],
      ["Accent", "--orange", "--paper"],
      ["On accent", "#ffffff", "--orange"],
      ["Moss on soft", "--green", "--green-soft"],
    ];
    pairs.forEach(([label, fgTok, bgTok]) => {
      const fg = fgTok.startsWith("#") ? fgTok : cssVar(fgTok);
      const bg = bgTok.startsWith("#") ? bgTok : cssVar(bgTok);
      let r = 1; try { r = ratio(fg, bg); } catch (e) {}
      const pass = r >= 4.5;
      const cell = el("div", "cpair");
      cell.style.background = bg; cell.style.color = fg;
      cell.innerHTML = `${label} <span class="ratio${pass ? " pass" : ""}">${r.toFixed(1)}:1 ${pass ? "AA" : "·"}</span>`;
      w.appendChild(cell);
    });
  }

  /* ---------- type scale ---------- */
  const TYPE = [
    ["--text-4xl", "36", "Display / marketing hero"],
    ["--text-3xl", "30", "Hero stat — route distance"],
    ["--text-2xl", "26", "Display"],
    ["--text-xl", "21", "Sub-display"],
    ["--text-lg", "17", "Card & section titles"],
    ["--text-md", "16", "Emphasised body"],
    ["--text-base", "14", "Body / input default"],
    ["--text-sm", "13", "Secondary UI, nav"],
    ["--text-xs", "12", "Captions, meta, hints"],
    ["--text-2xs", "11", "Micro caps, map labels"],
  ];
  const ts = $("#type-scale");
  TYPE.forEach(([tok, px, use]) => {
    const row = el("div", "type-row");
    const spec = el("div", "spec", "Scout the route");
    spec.style.fontSize = `var(${tok})`;
    spec.style.fontFamily = (+px >= 21) ? "var(--font-head)" : "var(--font-body)";
    spec.style.fontWeight = (+px >= 21) ? "600" : "500";
    row.appendChild(spec);
    row.appendChild(el("div", "info", `${tok} · ${px}px<br>${use}`));
    ts.appendChild(row);
  });

  /* ---------- spacing scale ---------- */
  const SPACE = [["--space-1", 4], ["--space-2", 8], ["--space-3", 12], ["--space-4", 16],
    ["--space-5", 20], ["--space-6", 24], ["--space-8", 32], ["--space-10", 40], ["--space-12", 48], ["--space-16", 64]];
  const sp = $("#space-scale");
  SPACE.forEach(([tok, px]) => {
    const row = el("div", "row");
    const bar = el("div", "bar"); bar.style.width = px + "px";
    row.appendChild(bar);
    row.appendChild(el("div", "lbl", tok));
    row.appendChild(el("div", "px", px + "px"));
    sp.appendChild(row);
  });

  /* ---------- radius scale ---------- */
  const RAD = [["--radius-xs", 6, "nested controls"], ["--radius-sm", 8, "small chips"],
    ["--radius-md", 11, "buttons · inputs · pills"], ["--radius-lg", 14, "cards"],
    ["--radius-xl", 18, "floating panels"], ["--radius-pill", 999, "toggles · chips"]];
  const rd = $("#radius-scale");
  RAD.forEach(([tok, px, use]) => {
    const row = el("div", "row");
    const box = el("div", "rad"); box.style.borderRadius = (px === 999 ? 22 : px) + "px";
    row.appendChild(box);
    row.appendChild(el("div", "lbl", tok));
    row.appendChild(el("div", "px", (px === 999 ? "full" : px + "px") + " · " + use));
    rd.appendChild(row);
  });

  /* ---------- favicon scaling ---------- */
  const fav = $("#favrow");
  [64, 48, 32, 16].forEach((sz) => {
    const r = Math.max(4, Math.round(sz * 0.26));
    const item = el("div", "fav-item");
    const tile = el("div", "fav-tile");
    tile.style.width = sz + "px"; tile.style.height = sz + "px"; tile.style.borderRadius = r + "px";
    const useId = sz <= 16 ? "#mark-b-solid" : "#mark-b";
    const ms = Math.round(sz * 0.62);
    tile.innerHTML = `<svg width="${ms}" height="${ms}" viewBox="0 0 40 40" style="color:var(--brand-cream-white);--ac:var(--brand-blaze-orange)"><use href="${useId}"/></svg>`;
    item.appendChild(tile);
    item.appendChild(el("div", "cap", sz + "px"));
    fav.appendChild(item);
  });

  /* ---------- init ---------- */
  let initial = "dark";
  try { initial = localStorage.getItem("br-ds-theme") || "dark"; } catch (e) {}
  setTheme(initial);
})();
