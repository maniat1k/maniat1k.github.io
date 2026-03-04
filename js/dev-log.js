(function() {
  "use strict";

  function formatDate(isoDate) {
    const date = new Date(isoDate || "");
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return date.toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "2-digit" });
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    return response.json();
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

  async function loadDevLog() {
    const section = document.getElementById("dev-log");
    const list = document.getElementById("devLogList");
    if (!section || !list) return;

    try {
      const payload = await fetchJson("data/devlog.json");
      const commits = Array.isArray(payload?.items) ? payload.items : [];
      if (!commits.length) throw new Error("Dev Log empty");

      list.innerHTML = "";
      commits.forEach((commit) => list.appendChild(createCommitCard(commit)));
    } catch (error) {
      console.error(error);
      // No empty state: remove the whole section when there is no valid build-time data.
      section.remove();
    }
  }

  document.addEventListener("DOMContentLoaded", loadDevLog);
})();
