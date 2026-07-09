import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "kofi-importer-"));
const dataFile = path.join(TMP_DIR, "data", "kofi-posts.json");
const imageDir = path.join(TMP_DIR, "assets", "images", "kofi");
const fixtureDir = path.join(ROOT_DIR, "tests", "fixtures", "kofi");

async function readGeneratedPosts() {
  return JSON.parse(await fs.readFile(dataFile, "utf8"));
}

async function readCachedImage(post) {
  assert.ok(post.image, `${post.title} should have a local image`);
  assert.equal(/^https?:\/\//i.test(post.image), false, `${post.title} image must not be remote`);
  return fs.readFile(path.join(TMP_DIR, post.image), "utf8");
}

await execFileAsync(process.execPath, ["scripts/fetch-kofi-posts.mjs"], {
  cwd: ROOT_DIR,
  env: {
    ...process.env,
    KOFI_FIXTURE_DIR: fixtureDir,
    KOFI_OUTPUT_ROOT: TMP_DIR,
    KOFI_DATA_FILE: dataFile,
    KOFI_IMAGE_DIR: imageDir,
    KOFI_LIMIT: "4",
    KOFI_USER: "maniat1kuy"
  }
});

const posts = await readGeneratedPosts();
assert.equal(posts.length, 4, "should generate all fixture posts");

const byTitle = new Map(posts.map((post) => [post.title, post]));
const ogPost = byTitle.get("Post og priority");
const twitterPost = byTitle.get("Post twitter fallback");
const contentPost = byTitle.get("Post content fallback");
const noImagePost = byTitle.get("Post no image");

assert.ok(ogPost, "og fixture post should exist");
assert.ok(twitterPost, "twitter fixture post should exist");
assert.ok(contentPost, "content fixture post should exist");
assert.ok(noImagePost, "no-image fixture post should exist");

const ogCache = await readCachedImage(ogPost);
assert.match(ogCache, /og-priority\.jpg/, "og:image should win");
assert.doesNotMatch(ogCache, /twitter-should-not-win|content-should-not-win/, "og:image must have priority");

const twitterCache = await readCachedImage(twitterPost);
assert.match(twitterCache, /twitter-fallback\.png/, "twitter:image should win when og:image is missing");
assert.doesNotMatch(twitterCache, /content-should-not-win/, "twitter:image must beat content image");

const contentCache = await readCachedImage(contentPost);
assert.match(contentCache, /content-fallback\.webp/, "content image should be used when metadata images are missing");
assert.doesNotMatch(contentCache, /avatar-ignore/, "profile/avatar-like images should be ignored");

assert.equal(noImagePost.image, undefined, "post without image should not fail and should not write image");

for (const post of posts) {
  if (post.image) {
    assert.equal(post.image.startsWith("assets/images/kofi/"), true, "cached image should use local repo path");
    assert.equal(/^https?:\/\//i.test(post.image), false, "JSON must not store remote image URLs");
  }
}

const feedLoaderSource = await fs.readFile(path.join(ROOT_DIR, "js", "feed-loader.js"), "utf8");
const testableFeedLoader = feedLoaderSource.replace(
  "document.addEventListener(\"DOMContentLoaded\", initFeeds);",
  "window.__normalizeKofiPostForTest = normalizeKofiPost;"
);
const context = {
  window: {},
  document: { addEventListener() {} },
  console,
  fetch: async () => {
    throw new Error("fetch should not run in this test");
  }
};

vm.runInNewContext(testableFeedLoader, context, { filename: "feed-loader.js" });

const normalizedRemote = context.window.__normalizeKofiPostForTest({
  title: "Remote image guard",
  url: "https://ko-fi.com/post/Remote-Image-Guard",
  image: "https://cdn.example.test/remote.jpg"
});
assert.equal(normalizedRemote.image, "", "feed-loader must ignore remote Ko-fi images");

const normalizedLocal = context.window.__normalizeKofiPostForTest({
  title: "Local image",
  url: "https://ko-fi.com/post/Local-Image",
  image: "assets/images/kofi/local.jpg"
});
assert.equal(normalizedLocal.image, "assets/images/kofi/local.jpg", "feed-loader should keep local Ko-fi images");

console.log("[test:kofi] importer fixtures and feed-loader guard passed");
