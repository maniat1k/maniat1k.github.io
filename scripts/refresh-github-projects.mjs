import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const CURATED_FILE = path.join(DATA_DIR, "projects.curated.json");
const PROJECTS_JS_FILE = path.join(DATA_DIR, "projects.data.js");
const CURATED_JS_FILE = path.join(DATA_DIR, "projects.curated.data.js");

const GITHUB_USER = "maniat1k";
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;

async function readJsonIfExists(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function mapRepo(repo) {
  return {
    name: repo.name,
    html_url: repo.html_url,
    description: repo.description || "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    language: repo.language || "",
    stargazers_count: Number(repo.stargazers_count || 0),
    forks_count: Number(repo.forks_count || 0),
    updated_at: repo.updated_at,
    homepage: repo.homepage || "",
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork)
  };
}

function buildDefaultPinned(projects) {
  return projects
    .filter((project) => !project.fork && !project.archived && project.description)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 8)
    .map((project) => project.name);
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "maniat1k-portfolio-refresh-script"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}`);
    }

    const repos = await response.json();
    const projects = repos.map(mapRepo);

    const projectsPayload = {
      source: API_URL,
      generated_at: new Date().toISOString(),
      total: projects.length,
      projects
    };

    await fs.writeFile(PROJECTS_FILE, JSON.stringify(projectsPayload, null, 2), "utf8");

    let curated = await readJsonIfExists(CURATED_FILE);
    if (!curated) {
      curated = {
        pinned: buildDefaultPinned(projects),
        hidden: []
      };
      await fs.writeFile(CURATED_FILE, JSON.stringify(curated, null, 2), "utf8");
      console.log(`Created ${path.relative(ROOT_DIR, CURATED_FILE)} with default pinned/hidden.`);
    } else {
      curated = {
        pinned: Array.isArray(curated.pinned) ? curated.pinned : [],
        hidden: Array.isArray(curated.hidden) ? curated.hidden : []
      };
      await fs.writeFile(CURATED_FILE, JSON.stringify(curated, null, 2), "utf8");
      console.log(`Normalized ${path.relative(ROOT_DIR, CURATED_FILE)}.`);
    }

    await fs.writeFile(
      PROJECTS_JS_FILE,
      `window.__PORTFOLIO_PROJECTS__ = ${JSON.stringify(projectsPayload, null, 2)};\n`,
      "utf8"
    );
    await fs.writeFile(
      CURATED_JS_FILE,
      `window.__PORTFOLIO_CURATED__ = ${JSON.stringify(curated, null, 2)};\n`,
      "utf8"
    );

    console.log(`Saved ${projects.length} repositories to ${path.relative(ROOT_DIR, PROJECTS_FILE)}.`);
  } catch (error) {
    const existingProjects = await readJsonIfExists(PROJECTS_FILE);
    if (existingProjects) {
      console.warn(`Could not refresh from GitHub (${error.message}). Keeping existing data/projects.json.`);
      return;
    }
    console.error(`Refresh failed and no local fallback exists: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
