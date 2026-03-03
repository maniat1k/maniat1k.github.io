(function() {
  "use strict";

  const USERNAME = "maniat1k";
  const API_URL = `https://api.github.com/users/${USERNAME}/events?per_page=50`;
  const LIMIT = 8;
  const TRIVIAL = new Set(["fix", "small fix", "typo", "format", "update", "wip"]);

  function formatDate(isoDate) {
    const date = new Date(isoDate || "");
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return date.toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "2-digit" });
  }

  function createSkeletonCard() {
    const col = document.createElement("div");
    col.className = "col-12 col-lg-6";
    col.innerHTML = `
      <article class="project-card h-100 p-4">
        <p class="project-meta mb-2 feed-skeleton-text"></p>
        <p class="mb-2 feed-skeleton-text"></p>
        <p class="project-meta mb-3 feed-skeleton-text"></p>
        <div class="feed-skeleton-text" style="max-width:140px;"></div>
      </article>
    `;
    return col;
  }

  function createCommitCard(item) {
    const col = document.createElement("div");
    col.className = "col-12 col-lg-6";
    col.innerHTML = `
      <article class="project-card h-100 p-4">
        <p class="project-meta mb-1">${item.repo}</p>
        <h3 class="h6 mb-2">${item.message}</h3>
        <p class="project-meta mb-3">${formatDate(item.date)}</p>
        <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${item.url}" target="_blank" rel="noopener noreferrer">Ver commit</a>
      </article>
    `;
    return col;
  }

  function normalizeCommit(item, repoName, eventDate) {
    const message = String(item.message || "").trim();
    if (!message) return null;
    if (TRIVIAL.has(message.toLowerCase())) return null;
    return {
      repo: repoName,
      message,
      date: eventDate,
      url: `https://github.com/${repoName}/commit/${item.sha}`
    };
  }

  async function loadDevLog() {
    const list = document.getElementById("devLogList");
    const fallback = document.getElementById("devLogFallback");
    if (!list || !fallback) return;

    list.innerHTML = "";
    for (let i = 0; i < 6; i += 1) {
      list.appendChild(createSkeletonCard());
    }

    try {
      const response = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`GitHub events error ${response.status}`);
      const events = await response.json();

      const commits = events
        .filter((event) => event && event.type === "PushEvent")
        .flatMap((event) => {
          const repoName = event?.repo?.name || "Repositorio";
          const date = event?.created_at || "";
          const all = Array.isArray(event?.payload?.commits) ? event.payload.commits : [];
          return all.map((commit) => normalizeCommit(commit, repoName, date)).filter(Boolean);
        })
        .slice(0, LIMIT);

      if (!commits.length) {
        throw new Error("No commits available");
      }

      list.innerHTML = "";
      commits.forEach((commit) => list.appendChild(createCommitCard(commit)));
      fallback.classList.add("d-none");
    } catch (error) {
      console.error(error);
      list.innerHTML = "";
      fallback.classList.remove("d-none");
    }
  }

  document.addEventListener("DOMContentLoaded", loadDevLog);
})();
