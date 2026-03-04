import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

const PROFILE_METRICS_FILE = path.join(DATA_DIR, "profile_metrics.json");
const AUTOMATIONS_FILE = path.join(DATA_DIR, "automations.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

const GITHUB_USER = "maniat1k";
const GITHUB_REPOS_API = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner&sort=updated`;

async function readJson(filePath, fallback = {}) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function computeYearsExperience(profileMetrics, now = new Date()) {
  const startDateRaw = profileMetrics?.experience_start_date;
  const startYearRaw = profileMetrics?.experience_start_year;

  if (startDateRaw) {
    const start = new Date(startDateRaw);
    if (!Number.isNaN(start.getTime())) {
      let years = now.getUTCFullYear() - start.getUTCFullYear();
      const nowMonth = now.getUTCMonth();
      const startMonth = start.getUTCMonth();
      const nowDay = now.getUTCDate();
      const startDay = start.getUTCDate();
      if (nowMonth < startMonth || (nowMonth === startMonth && nowDay < startDay)) {
        years -= 1;
      }
      return Math.max(0, years);
    }
  }

  const startYear = Number(startYearRaw);
  if (Number.isFinite(startYear) && startYear > 1900) {
    return Math.max(0, now.getUTCFullYear() - startYear);
  }

  return 0;
}

function computeAutomationsCount(automationsPayload) {
  if (Array.isArray(automationsPayload?.items)) {
    return automationsPayload.items.length;
  }
  const numericCount = Number(automationsPayload?.count);
  if (Number.isFinite(numericCount) && numericCount >= 0) {
    return Math.round(numericCount);
  }
  return 0;
}

function countPublicNonForkProjects(projectsPayload) {
  const projects = Array.isArray(projectsPayload?.projects) ? projectsPayload.projects : [];
  return projects.filter((repo) => !repo?.fork).length;
}

async function fetchGithubProjectCount() {
  const response = await fetch(GITHUB_REPOS_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "maniat1k-stats-generator"
    }
  });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}`);
  }
  const repos = await response.json();
  if (!Array.isArray(repos)) return 0;
  return repos.filter((repo) => !repo?.fork).length;
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const profileMetrics = await readJson(PROFILE_METRICS_FILE, {});
  const automations = await readJson(AUTOMATIONS_FILE, {});
  const projectsPayload = await readJson(PROJECTS_FILE, {});

  const yearsExperience = computeYearsExperience(profileMetrics);
  const automationsCount = computeAutomationsCount(automations);
  const analysisTestingHours = Math.max(0, Number(profileMetrics?.analysis_testing_hours || 0));

  let githubProjectsCount = countPublicNonForkProjects(projectsPayload);
  if (!githubProjectsCount) {
    try {
      githubProjectsCount = await fetchGithubProjectCount();
    } catch {
      githubProjectsCount = 0;
    }
  }

  const payload = {
    source: "generated-local-and-github",
    generated_at: new Date().toISOString(),
    years_experience: yearsExperience,
    automations_count: automationsCount,
    analysis_testing_hours: analysisTestingHours,
    github_projects_count: githubProjectsCount
  };

  await fs.writeFile(STATS_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Generated ${path.relative(ROOT_DIR, STATS_FILE)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
