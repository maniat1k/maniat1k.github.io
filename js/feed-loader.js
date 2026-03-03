(function() {
  "use strict";

  const SOURCE_LABELS = {
    instagram: "Instagram",
    youtube: "YouTube",
    reddit: "Reddit",
    x: "X"
  };

  const SOURCE_ORDER = ["instagram", "youtube", "reddit", "x"];
  const FALLBACK_VARIANTS = 3;
  const SKELETON_CARDS = 8;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const source = String(raw.source || "").toLowerCase();
    if (!SOURCE_LABELS[source]) return null;
    if (!raw.url || !raw.date) return null;

    return {
      source,
      title: String(raw.title || "Sin titulo"),
      url: String(raw.url),
      date: String(raw.date),
      image: String(raw.image || ""),
      image_alt: String(raw.image_alt || raw.title || "Imagen de contenido"),
      summary: String(raw.summary || ""),
      id: String(raw.id || "")
    };
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not fetch " + path);
    return res.json();
  }

  function fallbackImage(source, index) {
    const variant = (index % FALLBACK_VARIANTS) + 1;
    return `assets/fallback/${source}-${variant}.svg`;
  }

  function normalizeImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
      return value;
    }
    if (value.startsWith("/")) return value.slice(1);
    return value;
  }

  function hashToIndex(seed) {
    const s = String(seed || "");
    let acc = 0;
    for (let i = 0; i < s.length; i += 1) acc = (acc + s.charCodeAt(i)) % 97;
    return acc % FALLBACK_VARIANTS;
  }

  function ensureUniqueImages(items) {
    const used = new Set();
    const sourceIndex = { instagram: 0, youtube: 0, reddit: 0, x: 0 };

    return items.map((item) => {
      let image = item.image;

      if (!image) {
        image = fallbackImage(item.source, sourceIndex[item.source] || 0);
        sourceIndex[item.source] += 1;
      }

      if (used.has(image)) {
        let i = sourceIndex[item.source] || 0;
        let candidate = fallbackImage(item.source, i);
        while (used.has(candidate) && i < 20) {
          i += 1;
          candidate = fallbackImage(item.source, i);
        }
        sourceIndex[item.source] = i + 1;
        image = candidate;
      }

      used.add(image);
      return { ...item, image };
    });
  }

  function createCard(item) {
    const col = document.createElement("div");
    col.className = `col mb-4 portfolio-item ${item.source}`;

    const title = escapeHtml(item.title);
    const summary = escapeHtml(item.summary || item.title);
    const image = escapeHtml(normalizeImageUrl(item.image));
    const imageAlt = escapeHtml(item.image_alt || item.title);
    const url = escapeHtml(item.url);
    const sourceLabel = SOURCE_LABELS[item.source];
    const dateLabel = new Date(item.date).toLocaleDateString("es-UY", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });

    col.innerHTML = `
      <a href="${url}" title="${title}" target="_blank" rel="noopener noreferrer" class="d-block text-decoration-none">
        <div class="rounded-4 overflow-hidden" style="aspect-ratio: 4 / 3;">
          <img src="${image}" alt="${imageAlt}" data-source="${item.source}" data-item-id="${escapeHtml(item.id || "")}" class="img-fluid rounded-4" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </a>
      <p class="postg small mt-2 mb-1">${sourceLabel} · ${dateLabel}</p>
      <p class="postf small mb-0">${summary}</p>
    `;

    return col;
  }

  function createPlaceholderCard(source, text) {
    const col = document.createElement("div");
    col.className = `col mb-4 portfolio-item ${source} placeholder-card placeholder-${source}`;
    const image = normalizeImageUrl(fallbackImage(source, 0));
    const label = SOURCE_LABELS[source];
    col.innerHTML = `
      <div class="d-block text-decoration-none">
        <div class="rounded-4 overflow-hidden" style="aspect-ratio: 4 / 3;">
          <img src="${image}" alt="${text}" class="img-fluid rounded-4 feed-empty" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
      </div>
      <p class="postg small mt-2 mb-1">${label}</p>
      <p class="postf small mb-0">${escapeHtml(text)}</p>
    `;
    return col;
  }

  function createSkeletonCard(index) {
    const source = SOURCE_ORDER[index % SOURCE_ORDER.length];
    const col = document.createElement("div");
    col.className = `col mb-4 portfolio-item ${source} skeleton-card`;
    col.innerHTML = `
      <div class="rounded-4 overflow-hidden" style="aspect-ratio: 4 / 3;">
        <div class="img-fluid rounded-4 feed-skeleton" style="width:100%;height:100%;"></div>
      </div>
      <p class="postg small mt-2 mb-1 feed-skeleton-text"></p>
      <p class="postf small mb-0 feed-skeleton-text"></p>
    `;
    return col;
  }

  function updateFilterButtons(countBySource) {
    document.querySelectorAll("#filters a[data-source]").forEach((button) => {
      const source = button.getAttribute("data-source");
      if (source === "all") {
        button.setAttribute("data-filter", ":not(.placeholder-card)");
        return;
      }

      if (!SOURCE_LABELS[source]) return;
      button.setAttribute("data-filter", countBySource[source] > 0 ? `.${source}:not(.placeholder-card)` : `.placeholder-${source}`);
    });
  }

  function parsePayload(payload) {
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    const normalized = rawItems.map(normalizeItem).filter(Boolean);
    const unique = ensureUniqueImages(normalized);
    return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function loadItems() {
    try {
      return parsePayload(await fetchJson("data/all.json"));
    } catch (error) {
      if (window.__PORTFOLIO_FEEDS__) return parsePayload(window.__PORTFOLIO_FEEDS__);
      throw error;
    }
  }

  function renderSkeleton(grid) {
    grid.innerHTML = "";
    for (let i = 0; i < SKELETON_CARDS; i += 1) {
      grid.appendChild(createSkeletonCard(i));
    }
  }

  function renderItems(grid, items) {
    const countBySource = { instagram: 0, youtube: 0, reddit: 0, x: 0 };
    items.forEach((item) => {
      countBySource[item.source] += 1;
    });

    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(createCard(item)));
    SOURCE_ORDER.forEach((source) => {
      if (!countBySource[source]) grid.appendChild(createPlaceholderCard(source, "Sin publicaciones recientes"));
    });

    updateFilterButtons(countBySource);
    attachImageErrorFallback(grid);
  }

  function renderFatalFallback(grid) {
    grid.innerHTML = "";
    SOURCE_ORDER.forEach((source) => {
      grid.appendChild(createPlaceholderCard(source, "Sin publicaciones recientes"));
      grid.appendChild(createPlaceholderCard(source, "Volver a ejecutar feeds:build"));
    });
    updateFilterButtons({ instagram: 0, youtube: 0, reddit: 0, x: 0 });
    attachImageErrorFallback(grid);
  }

  function attachImageErrorFallback(grid) {
    const used = new Set();
    grid.querySelectorAll("img[data-source]").forEach((img) => {
      const source = img.getAttribute("data-source");
      const itemId = img.getAttribute("data-item-id") || "";
      const idx = hashToIndex(itemId);

      img.addEventListener(
        "error",
        function handleError() {
          let candidate = normalizeImageUrl(fallbackImage(source, idx));
          let tries = 0;
          while (used.has(candidate) && tries < 10) {
            tries += 1;
            candidate = normalizeImageUrl(fallbackImage(source, idx + tries));
          }
          img.src = candidate;
          used.add(candidate);
          img.removeEventListener("error", handleError);
        },
        { once: true }
      );
    });
  }

  async function initFeeds() {
    const grid = document.getElementById("portfolioGrid");
    if (!grid) return;

    renderSkeleton(grid);
    if (window.PortfolioGrid?.initIsotope) window.PortfolioGrid.initIsotope();

    try {
      const items = await loadItems();
      renderItems(grid, items);
    } catch (error) {
      console.error(error);
      renderFatalFallback(grid);
    }

    if (window.PortfolioGrid?.initIsotope) window.PortfolioGrid.initIsotope();
  }

  document.addEventListener("DOMContentLoaded", initFeeds);
})();
