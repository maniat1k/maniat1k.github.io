(function() {
  "use strict";

  function formatDate(dateText) {
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return dateText || "";
    return date.toLocaleDateString("es-UY", { year: "numeric", month: "short", day: "2-digit" });
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not fetch " + path);
    return res.json();
  }

  function renderItem(item) {
    const col = document.createElement("div");
    col.className = "col-12 col-lg-4";
    col.innerHTML = `
      <article class="project-card h-100 p-4">
        <p class="project-meta mb-2">${formatDate(item.date || "")}</p>
        <h3 class="h5 mb-2">${item.title || "Actualización técnica"}</h3>
        <p class="mb-3">${item.summary || ""}</p>
        ${item.link ? `<a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${item.link}" target="_blank" rel="noopener noreferrer">Ver referencia</a>` : ""}
      </article>
    `;
    return col;
  }

  async function initDevNotes() {
    const list = document.getElementById("devNotesList");
    const fallback = document.getElementById("devNotesFallback");
    if (!list || !fallback) return;

    try {
      const payload = await fetchJson("data/dev-notes.json");
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) throw new Error("No dev notes available");
      list.innerHTML = "";
      items.slice(0, 6).forEach((item) => list.appendChild(renderItem(item)));
    } catch (error) {
      list.innerHTML = "";
      fallback.classList.remove("d-none");
      console.error(error);
    }
  }

  document.addEventListener("DOMContentLoaded", initDevNotes);
})();
