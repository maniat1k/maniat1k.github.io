import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const CARDS_DIR = path.join(ROOT_DIR, "assets", "cards");
const FALLBACK_DIR = path.join(ROOT_DIR, "assets", "fallback");

const LIMIT = Number(process.env.FEEDS_LIMIT || 2);
const USER_AGENT = "maniat1k-feeds-bot/2.0 (+github-pages)";
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "";
const YOUTUBE_HANDLE = (process.env.YOUTUBE_HANDLE || "maniat1kUy").replace(/^@/, "");
const REDDIT_USER = process.env.REDDIT_USER || "maniat1k13";
const X_HANDLE = (process.env.X_HANDLE || "maniat1kUy").replace(/^@/, "");
const INSTAGRAM_RSS_URL = process.env.INSTAGRAM_RSS_URL || "";
const X_RSS_URL = process.env.X_RSS_URL || "";

const SOURCE_ORDER = ["instagram", "youtube", "reddit", "x"];
const FALLBACK_VARIANTS = 3;

function log(msg) {
  console.log(`[feeds] ${msg}`);
}

function stableId(source, seed) {
  return `${source}_${crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12)}`;
}

function toIso(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function cleanText(value, max = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePossiblyLooseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    let out = "";
    let inString = false;
    let escaped = false;

    for (let i = 0; i < content.length; i += 1) {
      const ch = content[i];
      if (!inString) {
        if (ch === '"') inString = true;
        out += ch;
        continue;
      }

      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }

      if (ch === "\n") {
        out += "\\n";
        continue;
      }

      if (ch === "\r") {
        continue;
      }

      if (ch === "\t") {
        out += "\\t";
        continue;
      }

      out += ch;
    }

    return JSON.parse(out);
  }
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function parseRssItems(xml) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
  const blocks = itemMatches.length ? itemMatches : entryMatches;

  return blocks.map((block) => {
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    const linkAttr = (block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i) || [])[1] || "";
    const linkTag = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "";
    const date =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] ||
      (block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] ||
      (block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) || [])[1] ||
      "";
    const description =
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] ||
      (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] ||
      "";

    return {
      title: stripHtml(title),
      url: stripHtml(linkAttr || linkTag),
      date: toIso(stripHtml(date)),
      summary: cleanText(stripHtml(description))
    };
  });
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(CARDS_DIR, { recursive: true });
  await fs.mkdir(FALLBACK_DIR, { recursive: true });
}

async function ensureFallbackAssets() {
  const palette = {
    instagram: ["#f56040", "#fd1d1d", "#833ab4"],
    youtube: ["#ff0000", "#e52d27", "#b31217"],
    reddit: ["#ff4500", "#ff6a33", "#ff8c5a"],
    x: ["#0f1419", "#1d9bf0", "#6e767d"]
  };

  for (const source of SOURCE_ORDER) {
    for (let idx = 1; idx <= FALLBACK_VARIANTS; idx += 1) {
      const target = path.join(FALLBACK_DIR, `${source}-${idx}.svg`);
      try {
        await fs.access(target);
      } catch {
        const colors = palette[source];
        const c1 = colors[(idx - 1) % colors.length];
        const c2 = colors[idx % colors.length];
        const label = source.toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  <circle cx="980" cy="160" r="180" fill="rgba(255,255,255,0.12)"/>
  <circle cx="180" cy="760" r="220" fill="rgba(255,255,255,0.10)"/>
  <text x="90" y="760" fill="rgba(255,255,255,0.9)" font-size="118" font-family="Arial, sans-serif" font-weight="700">${label}</text>
</svg>`;
        await fs.writeFile(target, svg, "utf8");
      }
    }
  }
}

async function readManualSource(source) {
  const manualPath = path.join(DATA_DIR, `${source}.manual.json`);
  try {
    const raw = parsePossiblyLooseJson(await fs.readFile(manualPath, "utf8"));
    const items = Array.isArray(raw) ? raw : raw.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const template = [
      {
        url: `https://example.com/${source}/1`,
        title: `${source} item 1`,
        date: new Date().toISOString()
      },
      {
        url: `https://example.com/${source}/2`,
        title: `${source} item 2`,
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    await fs.writeFile(manualPath, JSON.stringify(template, null, 2), "utf8");
    return template;
  }
}

async function fetchYoutubeItems() {
  let channelId = YOUTUBE_CHANNEL_ID;
  if (!channelId && YOUTUBE_HANDLE) {
    const html = await fetchText(`https://www.youtube.com/@${encodeURIComponent(YOUTUBE_HANDLE)}`);
    const match =
      html.match(/"externalId":"(UC[^"]+)"/) ||
      html.match(/"browseId":"(UC[^"]+)"/) ||
      html.match(/"channelId":"(UC[^"]+)"/);
    channelId = match ? match[1] : "";
  }
  if (!channelId) return [];

  const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]).slice(0, LIMIT);

  return entries.map((entry) => {
    const videoId = (entry.match(/<yt:videoId[^>]*>([\s\S]*?)<\/yt:videoId>/i) || [])[1] || "";
    const title = stripHtml((entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const published = stripHtml((entry.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || [])[1] || "");
    return {
      id: stableId("youtube", videoId || title),
      source: "youtube",
      title: cleanText(title || "Video de YouTube", 100),
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
      date: toIso(published),
      image_alt: title || "Video de YouTube",
      summary: cleanText(title),
      _officialImageUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
    };
  }).filter((item) => item.url);
}

async function fetchRedditItems() {
  const json = await fetchJson(`https://www.reddit.com/user/${encodeURIComponent(REDDIT_USER)}/overview.json?limit=20&raw_json=1`);
  const children = Array.isArray(json?.data?.children) ? json.data.children : [];

  const mapped = children
    .map((entry) => entry?.data || {})
    .map((data) => {
      const isComment = data.kind === "t1" || Boolean(data.body);
      const url = data.permalink ? `https://www.reddit.com${data.permalink}` : "";
      const idSeed = data.name || data.id || `${url}-${data.created_utc || ""}`;
      return {
        id: stableId("reddit", idSeed),
        source: "reddit",
        title: cleanText(data.title || `Comentario en r/${data.subreddit || ""}`, 100),
        url,
        date: toIso(data.created_utc ? data.created_utc * 1000 : Date.now()),
        image_alt: data.title || data.subreddit_name_prefixed || "Publicacion de Reddit",
        summary: cleanText(data.selftext || data.body || data.title || ""),
        _officialImageUrl: !isComment && /^https?:\/\//.test(data.thumbnail || "") ? data.thumbnail : ""
      };
    })
    .filter((item) => item.url)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return mapped.slice(0, LIMIT);
}

async function fetchManualOrRss(source, rssUrl) {
  if (rssUrl) {
    const xml = await fetchText(rssUrl);
    const parsed = parseRssItems(xml).slice(0, LIMIT);
    return parsed
      .map((entry) => ({
        id: stableId(source, entry.url || `${entry.title}-${entry.date}`),
        source,
        title: cleanText(entry.title || `${source} post`, 100),
        url: entry.url,
        date: toIso(entry.date),
        image_alt: entry.title || `${source} post`,
        summary: cleanText(entry.summary || entry.title || "")
      }))
      .filter((item) => item.url);
  }

  const manual = await readManualSource(source);
  return manual
    .slice(0, LIMIT)
    .map((entry) => ({
      id: stableId(source, entry.id || entry.url || `${entry.title}-${entry.date}`),
      source,
      title: cleanText(entry.title || `${source} post`, 100),
      url: String(entry.url || ""),
      date: toIso(entry.date),
      image_alt: entry.title || `${source} post`,
      summary: cleanText(entry.summary || entry.title || "")
    }))
    .filter((item) => item.url);
}

async function fetchXItems() {
  const candidates = [];
  if (X_RSS_URL) candidates.push(X_RSS_URL);
  if (X_HANDLE) {
    candidates.push(`https://nitter.net/${encodeURIComponent(X_HANDLE)}/rss`);
    candidates.push(`https://nitter.poast.org/${encodeURIComponent(X_HANDLE)}/rss`);
  }

  for (const rssUrl of candidates) {
    try {
      const items = await fetchManualOrRss("x", rssUrl);
      if (items.length) return items;
    } catch (error) {
      log(`x rss candidate failed (${rssUrl}): ${error.message}`);
    }
  }

  return fetchManualOrRss("x", "");
}

async function getOgImage(url) {
  try {
    const html = await fetchText(url);
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? String(match[1]).replace(/&amp;/g, "&") : "";
  } catch {
    return "";
  }
}

function extFromContentType(contentType) {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("svg")) return ".svg";
  return ".jpg";
}

async function downloadToCards(url, basename) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Image HTTP ${res.status}: ${url}`);
  const ctype = res.headers.get("content-type") || "";
  const ext = extFromContentType(ctype);
  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `${basename}${ext}`;
  const target = path.join(CARDS_DIR, filename);
  await fs.writeFile(target, buffer);
  return `assets/cards/${filename}`;
}

let playwrightRef = null;

async function getPlaywright() {
  if (playwrightRef) return playwrightRef;
  const mod = await import("playwright");
  playwrightRef = mod;
  return mod;
}

async function screenshotToCards(url, basename) {
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1200);
    const filename = `${basename}.jpg`;
    const target = path.join(CARDS_DIR, filename);
    await page.screenshot({
      path: target,
      type: "jpeg",
      quality: 72,
      fullPage: false
    });
    return `assets/cards/${filename}`;
  } finally {
    await browser.close();
  }
}

function fallbackImageFor(source, index) {
  const variant = (index % FALLBACK_VARIANTS) + 1;
  return `assets/fallback/${source}-${variant}.svg`;
}

function getDomainLabel(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host;
  } catch {
    return "link";
  }
}

function sourceColors(source) {
  if (source === "instagram") return ["#f56040", "#833ab4"];
  if (source === "youtube") return ["#ff0000", "#b31217"];
  if (source === "reddit") return ["#ff4500", "#ff7a1a"];
  if (source === "x") return ["#111111", "#1d9bf0"];
  return ["#333333", "#777777"];
}

function shortText(value, max) {
  const text = cleanText(value || "", max + 20);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

async function buildPortalCardImage(item, basename) {
  const [c1, c2] = sourceColors(item.source);
  const domain = getDomainLabel(item.url);
  const title = shortText(item.title, 70);
  const summary = shortText(item.summary || "", 110);
  const sourceLabel = String(item.source || "").toUpperCase();
  const filename = `${basename}_portal.svg`;
  const target = path.join(CARDS_DIR, filename);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${sourceLabel}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect x="72" y="86" width="1056" height="728" rx="38" fill="rgba(0,0,0,0.25)"/>
  <text x="116" y="185" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${sourceLabel} · ${domain}</text>
  <text x="116" y="295" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">${title}</text>
  <text x="116" y="395" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,0.93)">${summary}</text>
</svg>`;

  await fs.writeFile(target, svg, "utf8");
  return `assets/cards/${filename}`;
}

async function resolveImage(item, fallbackIndexBySource) {
  const basename = `${item.source}_${item.id}`;
  const preferPortalFirst = item.source === "x";
  const preferPortal =
    item.source === "x" ||
    item.source === "instagram" ||
    (item.source === "reddit" && String(item.title || "").toLowerCase().includes("comentario"));

  if (item._officialImageUrl) {
    try {
      const local = await downloadToCards(item._officialImageUrl, basename);
      return { image: local, _kind: "official" };
    } catch (error) {
      log(`official image failed for ${item.id}: ${error.message}`);
    }
  }

  if (preferPortalFirst) {
    try {
      const portalCard = await buildPortalCardImage(item, basename);
      return { image: portalCard, _kind: "portal" };
    } catch (error) {
      log(`portal card failed for ${item.id}: ${error.message}`);
    }
  }

  const ogUrl = await getOgImage(item.url);
  if (ogUrl) {
    try {
      const local = await downloadToCards(ogUrl, basename);
      return { image: local, _kind: "og" };
    } catch (error) {
      log(`og image failed for ${item.id}: ${error.message}`);
    }
  }

  if (preferPortal) {
    try {
      const portalCard = await buildPortalCardImage(item, basename);
      return { image: portalCard, _kind: "portal" };
    } catch (error) {
      log(`portal card failed for ${item.id}: ${error.message}`);
    }
  }

  try {
    const screenshot = await screenshotToCards(item.url, basename);
    return { image: screenshot, _kind: "screenshot", _screenshot: screenshot };
  } catch (error) {
    log(`screenshot failed for ${item.id}: ${error.message}`);
  }

  if (!preferPortal) {
    try {
      const portalCard = await buildPortalCardImage(item, basename);
      return { image: portalCard, _kind: "portal" };
    } catch (error) {
      log(`portal card failed for ${item.id}: ${error.message}`);
    }
  }

  const idx = fallbackIndexBySource[item.source] || 0;
  fallbackIndexBySource[item.source] = idx + 1;
  return { image: fallbackImageFor(item.source, idx), _kind: "fallback" };
}

function ensureUniqueImages(items) {
  const used = new Set();
  const fallbackRotation = { instagram: 0, youtube: 0, reddit: 0, x: 0 };

  for (const item of items) {
    let candidate = item.image;

    if (!candidate) {
      const idx = fallbackRotation[item.source] || 0;
      fallbackRotation[item.source] = idx + 1;
      candidate = fallbackImageFor(item.source, idx);
    }

    if (used.has(candidate)) {
      if (item._screenshot && !used.has(item._screenshot)) {
        candidate = item._screenshot;
      } else {
        let idx = fallbackRotation[item.source] || 0;
        let fallback = fallbackImageFor(item.source, idx);
        while (used.has(fallback) && idx < 20) {
          idx += 1;
          fallback = fallbackImageFor(item.source, idx);
        }
        fallbackRotation[item.source] = idx + 1;
        candidate = fallback;
      }
    }

    item.image = candidate;
    used.add(candidate);
  }

  return items;
}

function normalizeOutput(item) {
  return {
    source: item.source,
    title: item.title,
    url: item.url,
    date: item.date,
    image: item.image,
    image_alt: item.image_alt || item.title,
    summary: item.summary || "",
    id: item.id
  };
}

async function writeJson(filename, payload) {
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(payload, null, 2), "utf8");
}

async function buildSource(name, fetcher) {
  try {
    const rawItems = await fetcher();
    const fallbackIndexBySource = { instagram: 0, youtube: 0, reddit: 0, x: 0 };
    const withImages = [];

    for (const raw of rawItems.slice(0, LIMIT)) {
      const resolved = await resolveImage(raw, fallbackIndexBySource);
      withImages.push({ ...raw, ...resolved });
    }

    const unique = ensureUniqueImages(withImages).map(normalizeOutput);
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      source: name,
      generated_at: new Date().toISOString(),
      total: unique.length,
      items: unique,
      error: null
    };
  } catch (error) {
    log(`${name} failed: ${error.message}`);
    return {
      source: name,
      generated_at: new Date().toISOString(),
      total: 0,
      items: [],
      error: error.message
    };
  }
}

async function main() {
  await ensureDirs();
  await ensureFallbackAssets();

  const results = {};
  results.instagram = await buildSource("instagram", () => fetchManualOrRss("instagram", INSTAGRAM_RSS_URL));
  results.youtube = await buildSource("youtube", fetchYoutubeItems);
  results.reddit = await buildSource("reddit", fetchRedditItems);
  results.x = await buildSource("x", fetchXItems);

  for (const source of SOURCE_ORDER) {
    await writeJson(`${source}.json`, results[source]);
  }

  const allItems = SOURCE_ORDER.flatMap((source) => results[source].items || []).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  ensureUniqueImages(allItems);

  const allPayload = {
    source: "all",
    generated_at: new Date().toISOString(),
    total: allItems.length,
    items: allItems
  };

  await writeJson("all.json", allPayload);
  await fs.writeFile(
    path.join(DATA_DIR, "all.data.js"),
    `window.__PORTFOLIO_FEEDS__ = ${JSON.stringify(allPayload, null, 2)};\n`,
    "utf8"
  );

  log(
    `done: instagram=${results.instagram.total}, youtube=${results.youtube.total}, reddit=${results.reddit.total}, x=${results.x.total}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
