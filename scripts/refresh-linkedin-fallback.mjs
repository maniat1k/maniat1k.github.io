import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const LINKEDIN_MD_FILE = path.join(DATA_DIR, "linkedin.md");
const LINKEDIN_JS_FILE = path.join(DATA_DIR, "linkedin.data.js");

async function main() {
  const markdown = await fs.readFile(LINKEDIN_MD_FILE, "utf8");
  const payload = `window.__PORTFOLIO_LINKEDIN_MD__ = ${JSON.stringify(markdown)};\n`;
  await fs.writeFile(LINKEDIN_JS_FILE, payload, "utf8");
  console.log(`Saved ${path.relative(ROOT_DIR, LINKEDIN_JS_FILE)}.`);
}

main().catch((error) => {
  console.error(`Could not build LinkedIn fallback: ${error.message}`);
  process.exitCode = 1;
});
