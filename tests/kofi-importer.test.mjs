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

const UPDATE_TMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "kofi-update-"));
const updateDataFile = path.join(UPDATE_TMP_DIR, "data", "kofi-posts.json");
const updateImageDir = path.join(UPDATE_TMP_DIR, "assets", "images", "kofi");
const updateFixtureDir = path.join(UPDATE_TMP_DIR, "fixtures");
const existingNoImageUrl = "https://ko-fi.com/post/Existing-No-Image-UPDATED";
const existingWithImageUrl = "https://ko-fi.com/post/Existing-With-Local-KEEP";
const newWithImageUrl = "https://ko-fi.com/post/New-With-Image-NEW";
const existingLocalImage = "assets/images/kofi/existing-local.jpg";

await fs.mkdir(path.dirname(updateDataFile), { recursive: true });
await fs.mkdir(path.join(UPDATE_TMP_DIR, "assets", "images", "kofi"), { recursive: true });
await fs.mkdir(updateFixtureDir, { recursive: true });
await fs.writeFile(path.join(UPDATE_TMP_DIR, existingLocalImage), "existing-local-image-keep", "utf8");
await fs.writeFile(updateDataFile, JSON.stringify([
  {
    title: "Existing title without image",
    description: "Existing description without image",
    date: "2026-01-01",
    tags: ["keep", "no-image"],
    url: existingNoImageUrl,
    source: "kofi",
    label: "KO-FI"
  },
  {
    title: "Existing title with local image",
    description: "Existing description with local image",
    date: "2026-01-02",
    tags: ["keep", "has-image"],
    url: existingWithImageUrl,
    source: "kofi",
    label: "KO-FI",
    image: existingLocalImage
  },
  {
    title: "Invalid existing item",
    description: "Should be filtered out",
    date: "2026-01-03",
    tags: ["bad"],
    url: "https://media.ko-fi.com/api/CircularMask",
    source: "kofi",
    label: "KO-FI"
  }
], null, 2), "utf8");

await fs.writeFile(path.join(updateFixtureDir, "profile.html"), `
<!doctype html>
<a href="${existingNoImageUrl}">Existing without image</a>
<a href="${existingWithImageUrl}">Existing with local image</a>
<a href="${newWithImageUrl}">New post with image</a>
`, "utf8");

await fs.writeFile(path.join(updateFixtureDir, "Existing-No-Image-UPDATED.html"), `
<!doctype html>
<html>
  <head>
    <meta property="og:title" content="Fetched title should not overwrite existing">
    <meta property="og:description" content="Fetched description should not overwrite existing">
    <meta property="article:published_time" content="2026-02-01T00:00:00Z">
  </head>
  <body>
    <article>
      <img src="https://cdn.example.test/images/existing-now-has-content-image.jpg" alt="">
    </article>
  </body>
</html>
`, "utf8");

await fs.writeFile(path.join(updateFixtureDir, "Existing-With-Local-KEEP.html"), `
<!doctype html>
<html>
  <head>
    <meta property="og:title" content="Should not be fetched because local image is valid">
    <meta property="og:image" content="https://cdn.example.test/images/should-not-replace-local.jpg">
  </head>
</html>
`, "utf8");

await fs.writeFile(path.join(updateFixtureDir, "New-With-Image-NEW.html"), `
<!doctype html>
<html>
  <head>
    <meta property="og:title" content="New post with image">
    <meta property="og:description" content="New post description">
    <meta property="article:published_time" content="2026-02-02T00:00:00Z">
    <meta property="og:image" content="https://cdn.example.test/images/new-post-og-image.png">
  </head>
</html>
`, "utf8");

await execFileAsync(process.execPath, ["scripts/fetch-kofi-posts.mjs"], {
  cwd: ROOT_DIR,
  env: {
    ...process.env,
    KOFI_FIXTURE_DIR: updateFixtureDir,
    KOFI_OUTPUT_ROOT: UPDATE_TMP_DIR,
    KOFI_DATA_FILE: updateDataFile,
    KOFI_IMAGE_DIR: updateImageDir,
    KOFI_LIMIT: "5",
    KOFI_USER: "maniat1kuy"
  }
});

const updatedPosts = JSON.parse(await fs.readFile(updateDataFile, "utf8"));
assert.equal(updatedPosts.length, 3, "should update/create valid Ko-fi posts without duplicating invalid items");
const updatedByUrl = new Map(updatedPosts.map((post) => [post.url, post]));
const updatedExistingNoImage = updatedByUrl.get(existingNoImageUrl);
const updatedExistingWithImage = updatedByUrl.get(existingWithImageUrl);
const updatedNewPost = updatedByUrl.get(newWithImageUrl);

assert.ok(updatedExistingNoImage, "existing post without image should remain");
assert.equal(updatedExistingNoImage.title, "Existing title without image", "existing title should be preserved");
assert.equal(updatedExistingNoImage.description, "Existing description without image", "existing description should be preserved");
assert.equal(updatedExistingNoImage.date, "2026-01-01", "existing date should be preserved");
assert.deepEqual(updatedExistingNoImage.tags, ["keep", "no-image"], "existing tags should be preserved");
const updatedExistingNoImageCache = await fs.readFile(path.join(UPDATE_TMP_DIR, updatedExistingNoImage.image), "utf8");
assert.match(updatedExistingNoImageCache, /existing-now-has-content-image\.jpg/, "existing post without image should receive newly cached content image");

assert.ok(updatedExistingWithImage, "existing post with local image should remain");
assert.equal(updatedExistingWithImage.image, existingLocalImage, "valid local image should not be replaced");
assert.equal(await fs.readFile(path.join(UPDATE_TMP_DIR, existingLocalImage), "utf8"), "existing-local-image-keep", "existing local image file should remain untouched");

assert.ok(updatedNewPost, "new post should be created");
assert.equal(updatedNewPost.title, "New post with image", "new post should use fetched title");
const newPostCache = await fs.readFile(path.join(UPDATE_TMP_DIR, updatedNewPost.image), "utf8");
assert.match(newPostCache, /new-post-og-image\.png/, "new post should cache og:image");
assert.equal(updatedPosts.some((post) => post.url === "https://media.ko-fi.com/api/CircularMask"), false, "invalid non-post Ko-fi URLs should be filtered");
for (const post of updatedPosts) {
  if (post.image) assert.equal(/^https?:\/\//i.test(post.image), false, "updated JSON must not store remote image URLs");
}

console.log("[test:kofi] importer fixtures and feed-loader guard passed");
