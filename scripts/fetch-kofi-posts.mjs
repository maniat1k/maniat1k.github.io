import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_ROOT = process.env.KOFI_OUTPUT_ROOT ? path.resolve(process.env.KOFI_OUTPUT_ROOT) : ROOT_DIR;
const DATA_FILE = process.env.KOFI_DATA_FILE
  ? path.resolve(process.env.KOFI_DATA_FILE)
  : path.join(ROOT_DIR, "data", "kofi-posts.json");
const IMAGE_DIR = process.env.KOFI_IMAGE_DIR
  ? path.resolve(process.env.KOFI_IMAGE_DIR)
  : path.join(ROOT_DIR, "assets", "images", "kofi");
const FIXTURE_DIR = process.env.KOFI_FIXTURE_DIR ? path.resolve(process.env.KOFI_FIXTURE_DIR) : "";
const KOFI_USER = (process.env.KOFI_USER || "maniat1kuy").replace(/^@/, "");
const LIMIT = Number(process.env.KOFI_LIMIT || 12);
const USER_AGENT = "maniat1k-kofi-bot/1.0 (+github-pages)";

function log(message) {
  console.log(`[kofi] ${message}`);
}

function warn(message) {
  console.warn(`[kofi] warning: ${message}`);
}

function toPosixPath(filePath) {
  return path.relative(OUTPUT_ROOT, filePath).split(path.sep).join("/");
}

function stableId(seed) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

function slugify(value) {
  return String(value || "kofi-post")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "kofi-post";
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "));
}

function cleanText(value, max = 240) {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

function toIsoDate(value, fallback = "") {
  const date = new Date(value || fallback || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function absoluteUrl(url, base = `https://ko-fi.com/${KOFI_USER}`) {
  const value = decodeHtml(url);
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

async function fetchText(url) {
  if (FIXTURE_DIR) {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const slug = pathname.startsWith("/post/") ? pathname.split("/").filter(Boolean)[1] : "";
    const fixtureName = slug ? `${slug}.html` : "profile.html";
    return fs.readFile(path.join(FIXTURE_DIR, fixtureName), "utf8");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function getMeta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function discoverPostUrls(html) {
  const urls = new Set();
  const hrefMatches = html.matchAll(/href=["']([^"']*\/post\/[^"']+)["']/gi);
  for (const match of hrefMatches) {
    const url = absoluteUrl(match[1]);
    if (url.includes("/post/")) urls.add(url.split("?")[0]);
  }

  const plainMatches = html.matchAll(/https:\/\/ko-fi\.com\/post\/[A-Za-z0-9-]+/g);
  for (const match of plainMatches) urls.add(match[0]);

  return [...urls];
}

function getJsonLdDate(html) {
  const match =
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i) ||
    html.match(/"dateCreated"\s*:\s*"([^"]+)"/i) ||
    html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || "";
}

function getMainContentImage(html, baseUrl) {
  const candidates = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => absoluteUrl(match[1], baseUrl))
    .filter(Boolean)
    .filter((url) => !/avatar|profile|logo|favicon|icon|emoji/i.test(url));

  return candidates.find((url) => /^https?:\/\//i.test(url)) || "";
}

function getPostSlugFromUrl(url) {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] || parts[0] || "";
}

function imageExt(contentType, url) {
  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  if (/gif/i.test(contentType)) return ".gif";
  if (/svg/i.test(contentType)) return ".svg";
  if (/jpe?g/i.test(contentType)) return ".jpg";
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext) ? ext : ".jpg";
}

async function writeIfChanged(filePath, buffer) {
  try {
    const current = await fs.readFile(filePath);
    if (Buffer.compare(current, buffer) === 0) return false;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.writeFile(filePath, buffer);
  return true;
}

async function cacheImage(remoteUrl, post) {
  if (!remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return "";

  let contentType = "";
  let buffer;

  if (FIXTURE_DIR) {
    const ext = path.extname(new URL(remoteUrl).pathname).toLowerCase();
    contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    buffer = Buffer.from(`mock-image:${remoteUrl}`);
  } else {
    const response = await fetch(remoteUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${remoteUrl}`);

    contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`not an image (${contentType || "unknown content-type"})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const slug = slugify(getPostSlugFromUrl(post.url) || post.title);
  const ext = imageExt(contentType, remoteUrl);
  const filePath = path.join(IMAGE_DIR, `${slug}-${stableId(remoteUrl)}${ext}`);

  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const changed = await writeIfChanged(filePath, buffer);
  if (changed) log(`cached image: ${toPosixPath(filePath)}`);
  return toPosixPath(filePath);
}

async function readExistingPosts() {
  try {
    const payload = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    const posts = Array.isArray(payload) ? payload : payload?.posts;
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }
}

function normalizeExisting(post) {
  return {
    title: String(post.title || "Post en Ko-fi"),
    description: String(post.description || post.summary || ""),
    date: String(post.date || ""),
    tags: Array.isArray(post.tags) ? post.tags.map(String) : ["kofi"],
    url: String(post.url || ""),
    source: "kofi",
    label: String(post.label || "KO-FI"),
    ...(post.image ? { image: String(post.image) } : {})
  };
}

async function discoverPosts() {
  const pages = [
    `https://ko-fi.com/${encodeURIComponent(KOFI_USER)}/posts`,
    `https://ko-fi.com/${encodeURIComponent(KOFI_USER)}`
  ];
  const urls = new Set();

  for (const page of pages) {
    try {
      const html = await fetchText(page);
      discoverPostUrls(html).forEach((url) => urls.add(url));
    } catch (error) {
      warn(`could not fetch ${page}: ${error.message}`);
    }
  }

  return [...urls].slice(0, LIMIT);
}

async function buildPost(url, existingByUrl) {
  const previous = existingByUrl.get(url) || {};
  let html = "";

  try {
    html = await fetchText(url);
  } catch (error) {
    warn(`could not fetch post ${url}: ${error.message}`);
    return normalizeExisting({ ...previous, url });
  }

  const title = cleanText(
    getMeta(html, "og:title") ||
    getMeta(html, "twitter:title") ||
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ||
    previous.title ||
    "Post en Ko-fi",
    120
  ).replace(/\s*\|\s*Ko-fi.*$/i, "");

  const description = cleanText(
    getMeta(html, "og:description") ||
    getMeta(html, "twitter:description") ||
    previous.description ||
    previous.summary ||
    "",
    240
  );

  const remoteImage =
    getMeta(html, "og:image") ||
    getMeta(html, "twitter:image") ||
    getMainContentImage(html, url);

  let image = "";
  if (remoteImage) {
    try {
      image = await cacheImage(absoluteUrl(remoteImage, url), { url, title });
    } catch (error) {
      warn(`could not cache image for ${url}: ${error.message}`);
    }
  } else {
    warn(`no image found for ${url}`);
  }

  return normalizeExisting({
    title,
    description,
    date: toIsoDate(getMeta(html, "article:published_time") || getJsonLdDate(html), previous.date),
    tags: Array.isArray(previous.tags) && previous.tags.length ? previous.tags : ["kofi"],
    url,
    image: image || previous.image || "",
    source: "kofi",
    label: "KO-FI"
  });
}

async function writePosts(posts) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(`${DATA_FILE}.tmp`, JSON.stringify(posts, null, 2) + "\n", "utf8");
  JSON.parse(await fs.readFile(`${DATA_FILE}.tmp`, "utf8"));
  await fs.rename(`${DATA_FILE}.tmp`, DATA_FILE);
}

async function main() {
  const existingPosts = (await readExistingPosts()).map(normalizeExisting).filter((post) => post.url);
  const existingByUrl = new Map(existingPosts.map((post) => [post.url, post]));
  let discoveredUrls = await discoverPosts();

  if (!discoveredUrls.length) {
    discoveredUrls = existingPosts.map((post) => post.url).filter(Boolean);
    if (!discoveredUrls.length) {
      warn("no Ko-fi posts discovered; keeping current data/kofi-posts.json");
      await writePosts(existingPosts);
      return;
    }
    warn("no Ko-fi post listing discovered; trying existing post URLs to refresh metadata/images");
  }

  const posts = [];
  for (const url of discoveredUrls) {
    posts.push(await buildPost(url, existingByUrl));
  }

  const merged = new Map();
  [...posts, ...existingPosts].forEach((post) => {
    if (!post.url || merged.has(post.url)) return;
    merged.set(post.url, post);
  });

  const output = [...merged.values()]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, LIMIT);

  await writePosts(output);
  log(`done: ${output.length} Ko-fi posts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildPost,
  getMainContentImage,
  getMeta,
  main,
  normalizeExisting
};
