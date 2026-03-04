import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const PROJECTS_JS_FILE = path.join(DATA_DIR, "projects.data.js");
const PINNED_FILE = path.join(DATA_DIR, "pinned.json");
const DEVLOG_FILE = path.join(DATA_DIR, "devlog.json");
const GITHUB_LANGUAGES_FILE = path.join(DATA_DIR, "github_languages.json");
const GITHUB_PROJECT_CARDS_FILE = path.join(DATA_DIR, "github_project_cards.json");

const GITHUB_USER = "maniat1k";
const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;
const GRAPHQL_URL = "https://api.github.com/graphql";
const DEVLOG_LIMIT = 8;
const CARD_LIMIT = 4;
const TRIVIAL_MESSAGES = new Set(["fix", "small fix", "typo", "format", "update", "wip"]);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

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
    full_name: repo.full_name,
    default_branch: repo.default_branch || "main",
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
    fork: Boolean(repo.fork),
    owner: {
      login: repo?.owner?.login || GITHUB_USER
    }
  };
}

function githubHeaders(extra = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "maniat1k-portfolio-refresh-script",
    ...extra
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: githubHeaders(extraHeaders) });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} (${url})`);
  }
  return response.json();
}

async function fetchText(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: githubHeaders(extraHeaders) });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status} (${url})`);
  }
  return response.text();
}

function firstParagraph(markdown) {
  const text = String(markdown || "")
    .replace(/\r/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();

  if (!text) return "";

  const parts = text.split(/\n\s*\n/).map((chunk) => chunk.replace(/\n+/g, " ").trim()).filter(Boolean);
  return parts[0] || "";
}

async function resolveRepoSnippet(repo) {
  if (repo.description) return repo.description;
  const owner = repo?.owner?.login || GITHUB_USER;
  const branch = repo.default_branch || "main";
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo.name}/${branch}/README.md`;
  try {
    const markdown = await fetchText(rawUrl);
    return firstParagraph(markdown) || "";
  } catch {
    return "";
  }
}

async function fetchPinnedRepos() {
  if (!GITHUB_TOKEN) {
    throw new Error("Missing GITHUB_TOKEN for GraphQL pinned items");
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
            }
          }
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: githubHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      query,
      variables: { login: GITHUB_USER }
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error ${response.status}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload.errors) && payload.errors.length) {
    throw new Error(payload.errors[0]?.message || "GraphQL query failed");
  }

  const nodes = payload?.data?.user?.pinnedItems?.nodes || [];
  return nodes.map((node) => node?.name).filter(Boolean);
}

function normalizeCommitMessage(message) {
  const value = String(message || "").trim();
  return value;
}

function buildLanguageList(languageTotals) {
  return Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes }));
}

async function buildDevLog(repos) {
  const commits = [];
  const candidates = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 8);

  for (const repo of candidates) {
    try {
      const owner = repo?.owner?.login || GITHUB_USER;
      const url = `https://api.github.com/repos/${owner}/${repo.name}/commits?per_page=5`;
      const payload = await fetchJson(url);
      for (const commit of payload) {
        const message = normalizeCommitMessage(commit?.commit?.message?.split("\n")[0]);
        if (!message) continue;
        if (TRIVIAL_MESSAGES.has(message.toLowerCase())) continue;
        commits.push({
          repo: repo.name,
          message,
          date: commit?.commit?.committer?.date || commit?.commit?.author?.date || "",
          url: commit?.html_url || repo.html_url
        });
      }
    } catch {
      // Keep existing commits from other repos.
    }
  }

  commits.sort((a, b) => new Date(b.date) - new Date(a.date));
  return commits.slice(0, DEVLOG_LIMIT);
}

async function buildLanguageTotals(repos) {
  const totals = {};
  const candidates = repos.filter((repo) => !repo.fork && !repo.archived);

  for (const repo of candidates) {
    try {
      const owner = repo?.owner?.login || GITHUB_USER;
      const url = `https://api.github.com/repos/${owner}/${repo.name}/languages`;
      const payload = await fetchJson(url);
      for (const [name, bytes] of Object.entries(payload || {})) {
        totals[name] = Number(totals[name] || 0) + Number(bytes || 0);
      }
    } catch {
      // Keep partial language totals.
    }
  }

  return totals;
}

async function buildGithubCards(repos) {
  const clean = repos.filter((repo) => !repo.fork && !repo.archived);
  // Required order: first by stars, then fill gaps with most recently updated repos.
  const byStars = [...clean].sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at));

  const selected = [];
  const selectedNames = new Set();
  for (const repo of byStars) {
    if (selected.length >= CARD_LIMIT) break;
    selected.push(repo);
    selectedNames.add(repo.name);
  }

  if (selected.length < CARD_LIMIT) {
    const byUpdated = [...clean].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    for (const repo of byUpdated) {
      if (selected.length >= CARD_LIMIT) break;
      if (selectedNames.has(repo.name)) continue;
      selected.push(repo);
      selectedNames.add(repo.name);
    }
  }

  const cards = [];
  for (const repo of selected) {
    const summary = await resolveRepoSnippet(repo);
    const owner = repo?.owner?.login || GITHUB_USER;
    // GitHub Open Graph preview image for repository cards.
    const image = `https://opengraph.githubassets.com/1/${owner}/${repo.name}`;
    cards.push({
      source: "github",
      id: `github_${repo.name}`,
      title: repo.name,
      url: repo.html_url,
      date: repo.updated_at,
      summary: summary || "Repositorio público en GitHub.",
      image,
      image_alt: `Preview de ${repo.name}`,
      stars: Number(repo.stargazers_count || 0),
      updated_at: repo.updated_at
    });
  }
  return cards;
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const repos = await fetchJson(API_URL);
    const projects = repos.map(mapRepo);

    const projectsPayload = {
      source: API_URL,
      generated_at: new Date().toISOString(),
      total: projects.length,
      projects
    };

    await fs.writeFile(PROJECTS_FILE, JSON.stringify(projectsPayload, null, 2), "utf8");

    await fs.writeFile(
      PROJECTS_JS_FILE,
      `window.__PORTFOLIO_PROJECTS__ = ${JSON.stringify(projectsPayload, null, 2)};\n`,
      "utf8"
    );

    const existingPinned = await readJsonIfExists(PINNED_FILE);
    let pinnedRepos = [];
    try {
      pinnedRepos = await fetchPinnedRepos();
    } catch (error) {
      // Keep current pinned badges stable when GraphQL is temporarily unavailable.
      pinnedRepos = Array.isArray(existingPinned?.repos) ? existingPinned.repos : [];
      console.warn(`Pinned GraphQL refresh failed (${error.message}). Keeping existing pinned data.`);
    }

    const pinnedPayload = {
      source: "github-graphql-pinned",
      generated_at: new Date().toISOString(),
      repos: pinnedRepos
    };
    await fs.writeFile(PINNED_FILE, JSON.stringify(pinnedPayload, null, 2), "utf8");

    const existingDevLog = await readJsonIfExists(DEVLOG_FILE);
    let devLogItems = [];
    try {
      devLogItems = await buildDevLog(projects);
    } catch (error) {
      devLogItems = Array.isArray(existingDevLog?.items) ? existingDevLog.items : [];
      console.warn(`Dev log refresh failed (${error.message}). Keeping existing devlog data.`);
    }
    const devLogPayload = {
      source: "github-commits",
      generated_at: new Date().toISOString(),
      total: devLogItems.length,
      items: devLogItems
    };
    await fs.writeFile(DEVLOG_FILE, JSON.stringify(devLogPayload, null, 2), "utf8");

    const existingLanguages = await readJsonIfExists(GITHUB_LANGUAGES_FILE);
    let languageTotals = {};
    try {
      languageTotals = await buildLanguageTotals(projects);
    } catch (error) {
      languageTotals = existingLanguages?.totals || {};
      console.warn(`GitHub languages refresh failed (${error.message}). Keeping existing languages data.`);
    }
    const languageList = buildLanguageList(languageTotals);
    const languagesPayload = {
      source: "github-languages",
      generated_at: new Date().toISOString(),
      totals: languageTotals,
      languages: languageList
    };
    await fs.writeFile(GITHUB_LANGUAGES_FILE, JSON.stringify(languagesPayload, null, 2), "utf8");

    const existingCards = await readJsonIfExists(GITHUB_PROJECT_CARDS_FILE);
    let githubCards = [];
    try {
      githubCards = await buildGithubCards(projects);
    } catch (error) {
      githubCards = Array.isArray(existingCards?.items) ? existingCards.items : [];
      console.warn(`GitHub project cards refresh failed (${error.message}). Keeping existing cards data.`);
    }
    const cardsPayload = {
      source: "github-project-cards",
      generated_at: new Date().toISOString(),
      total: githubCards.length,
      items: githubCards
    };
    await fs.writeFile(GITHUB_PROJECT_CARDS_FILE, JSON.stringify(cardsPayload, null, 2), "utf8");

    console.log(`Saved ${projects.length} repositories and supporting JSON data in ${path.relative(ROOT_DIR, DATA_DIR)}.`);
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
