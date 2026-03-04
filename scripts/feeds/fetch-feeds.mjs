import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const LIMIT = Number(process.env.FEEDS_LIMIT || 2);
const USER_AGENT = "maniat1k-feeds-bot/3.0 (+github-pages)";

const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "";
const YOUTUBE_HANDLE = (process.env.YOUTUBE_HANDLE || "maniat1kUy").replace(/^@/, "");
const INSTAGRAM_RSS_URL = process.env.INSTAGRAM_RSS_URL || "";

const SOURCE_ORDER = ["instagram", "youtube"];

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

      if (ch === "\r") continue;
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

  return entries
    .map((entry) => {
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
        image: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
      };
    })
    .filter((item) => item.url);
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
        summary: cleanText(entry.summary || entry.title || ""),
        image: String(entry.image || "")
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
      summary: cleanText(entry.summary || entry.title || ""),
      image: String(entry.image || "")
    }))
    .filter((item) => item.url);
}

function normalizeOutput(item) {
  return {
    source: item.source,
    title: item.title,
    url: item.url,
    date: item.date,
    image: item.image || "",
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
    const unique = rawItems.map(normalizeOutput);
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

async function readGithubCards() {
  const filePath = path.join(DATA_DIR, "github_project_cards.json");
  try {
    const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return items
      .map((item) => ({
        source: "github",
        id: String(item.id || `github_${item.title || "repo"}`),
        title: String(item.title || "Proyecto GitHub"),
        url: String(item.url || ""),
        date: toIso(item.updated_at || item.date),
        image: "",
        image_alt: String(item.title || "Proyecto GitHub"),
        summary: cleanText(item.summary || ""),
        stars: Number(item.stars || 0),
        updated_at: toIso(item.updated_at || item.date)
      }))
      .filter((item) => item.url);
  } catch {
    return [];
  }
}

async function main() {
  await ensureDirs();

  const results = {};
  results.instagram = await buildSource("instagram", () => fetchManualOrRss("instagram", INSTAGRAM_RSS_URL));
  results.youtube = await buildSource("youtube", fetchYoutubeItems);

  for (const source of SOURCE_ORDER) {
    await writeJson(`${source}.json`, results[source]);
  }

  const githubCards = await readGithubCards();

  const allItems = SOURCE_ORDER.flatMap((source) => results[source].items || [])
    .concat(githubCards)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

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

  log(`done: instagram=${results.instagram.total}, youtube=${results.youtube.total}, github=${githubCards.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
