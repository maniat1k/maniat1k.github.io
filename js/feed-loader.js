(function() {
  "use strict";

  const SOURCE_LABELS = {
    instagram: "Instagram",
    youtube: "YouTube",
    github: "GitHub"
  };

  const SOURCE_ORDER = ["instagram", "youtube", "github"];

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
      id: String(raw.id || ""),
      stars: Number(raw.stars || 0),
      updated_at: String(raw.updated_at || raw.date || "")
    };
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not fetch " + path);
    return res.json();
  }

  function normalizeImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
    if (value.startsWith("/")) return value.slice(1);
    return value;
  }

  function formatDate(dateText) {
    const date = new Date(dateText || "");
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("es-UY", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function createCard(item) {
    const col = document.createElement("div");
    col.className = `col mb-4 portfolio-item ${item.source}`;

    if (item.source === "github") {
      col.innerHTML = `
        <a href="${escapeHtml(item.url)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer" class="d-block text-decoration-none h-100">
          <article class="project-card feed-card github-project-card h-100">
            <div class="feed-card-media github-media overflow-hidden position-relative d-flex align-items-center justify-content-center">
              <svg class="github-media-mark" width="120" height="120" aria-hidden="true" focusable="false">
                <use xlink:href="#github"></use>
              </svg>
              <div class="github-media-overlay d-flex align-items-end justify-content-between p-3">
                <p class="feed-media-label mb-0">GitHub Project</p>
                <svg class="github-card-icon" width="20" height="20" aria-hidden="true" focusable="false">
                  <use xlink:href="#github"></use>
                </svg>
              </div>
            </div>
            <div class="feed-card-body p-3 p-xl-4 d-flex flex-column">
              <h3 class="h4 mb-2">${escapeHtml(item.title)}</h3>
              <p class="project-meta mb-3">★ ${item.stars} · Updated ${formatDate(item.updated_at || item.date)}</p>
              <p class="postf mb-0 feed-summary">${escapeHtml(item.summary || "Repositorio público en GitHub.")}</p>
            </div>
          </article>
        </a>
      `;
      return col;
    }

    const title = escapeHtml(item.title);
    const summary = escapeHtml(item.summary || item.title);
    const image = escapeHtml(normalizeImageUrl(item.image));
    const imageAlt = escapeHtml(item.image_alt || item.title);
    const url = escapeHtml(item.url);
    const sourceLabel = SOURCE_LABELS[item.source];
    const dateLabel = formatDate(item.date);
    const sourceIcon = item.source === "instagram" ? "instagram" : "youtube";

    col.innerHTML = `
      <article class="project-card feed-card h-100">
        <a href="${url}" title="${title}" target="_blank" rel="noopener noreferrer" class="d-block text-decoration-none feed-card-media overflow-hidden position-relative">
          <img src="${image}" alt="${imageAlt}" data-source="${item.source}" data-item-id="${escapeHtml(item.id || "")}" class="img-fluid" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
          <div class="media-overlay-band d-flex align-items-end justify-content-between p-3">
            <p class="feed-media-label mb-0">${sourceLabel}</p>
            <svg class="feed-media-icon" width="20" height="20" aria-hidden="true" focusable="false">
              <use xlink:href="#${sourceIcon}"></use>
            </svg>
          </div>
        </a>
        <div class="feed-card-body p-3 p-xl-4 d-flex flex-column">
          <p class="postg small mb-2">${sourceLabel} · ${dateLabel}</p>
          <p class="postf small mb-0 feed-summary">${summary}</p>
        </div>
      </article>
    `;

    return col;
  }

  function interleaveBySource(items) {
    const buckets = {};
    SOURCE_ORDER.forEach((source) => {
      buckets[source] = [];
    });

    items.forEach((item) => {
      if (!buckets[item.source]) buckets[item.source] = [];
      buckets[item.source].push(item);
    });

    Object.keys(buckets).forEach((source) => {
      buckets[source].sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    const mixed = [];
    let hasItems = true;

    while (hasItems) {
      hasItems = false;
      SOURCE_ORDER.forEach((source) => {
        if (buckets[source] && buckets[source].length) {
          mixed.push(buckets[source].shift());
          hasItems = true;
        }
      });
    }

    return mixed;
  }

  function parsePayload(payload) {
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    const normalized = rawItems.map(normalizeItem).filter(Boolean);
    return normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function parseGithubCards(payload) {
    const rawItems = Array.isArray(payload?.items) ? payload.items : [];
    return rawItems
      .map((item) =>
        normalizeItem({
          source: "github",
          title: item?.title,
          url: item?.url,
          date: item?.updated_at || item?.date,
          image: item?.image || "",
          image_alt: item?.image_alt || item?.title || "Proyecto GitHub",
          summary: item?.summary || "",
          id: item?.id || "",
          stars: item?.stars || 0,
          updated_at: item?.updated_at || item?.date
        })
      )
      .filter(Boolean);
  }

  async function loadItems() {
    let baseItems = [];
    try {
      baseItems = parsePayload(await fetchJson("data/all.json"));
    } catch (error) {
      if (window.__PORTFOLIO_FEEDS__) {
        baseItems = parsePayload(window.__PORTFOLIO_FEEDS__);
      } else {
        throw error;
      }
    }

    try {
      const githubPayload = await fetchJson("data/github_project_cards.json");
      const githubItems = parseGithubCards(githubPayload);
      const withoutGithub = baseItems.filter((item) => item.source !== "github");
      return interleaveBySource(withoutGithub.concat(githubItems));
    } catch {
      return interleaveBySource(baseItems);
    }
  }

  function updateFilterButtons(countBySource) {
    const filters = document.getElementById("filters");
    if (!filters) return;

    const buttons = Array.from(filters.querySelectorAll("a[data-source]"));
    buttons.forEach((button) => {
      const source = button.getAttribute("data-source");
      if (source === "all") {
        const total = SOURCE_ORDER.reduce((acc, name) => acc + Number(countBySource[name] || 0), 0);
        button.classList.toggle("d-none", total === 0);
        return;
      }

      if (!SOURCE_LABELS[source]) return;
      const hasItems = Number(countBySource[source] || 0) > 0;
      button.classList.toggle("d-none", !hasItems);
      button.setAttribute("data-filter", `.${source}`);
    });

    const selected = filters.querySelector("a.is-checked:not(.d-none)");
    if (!selected) {
      const fallbackButton = filters.querySelector('a[data-source="all"]:not(.d-none)') || filters.querySelector("a[data-source]:not(.d-none)");
      if (fallbackButton) {
        filters.querySelectorAll("a.is-checked").forEach((node) => node.classList.remove("is-checked"));
        fallbackButton.classList.add("is-checked");
      }
    }

    // Keep navigation clean: hide the whole tab bar when only one source is available.
    const visibleTabs = buttons.filter((button) => !button.classList.contains("d-none"));
    filters.classList.toggle("d-none", visibleTabs.length <= 1);
  }

  function attachImageErrorFallback(grid) {
    grid.querySelectorAll("img[data-source]").forEach((img) => {
      img.addEventListener(
        "error",
        function handleError() {
          const wrapper = img.closest(".feed-card-media");
          if (wrapper) {
            wrapper.innerHTML = '<div class="feed-empty-frame" aria-hidden="true"></div>';
          } else {
            img.remove();
          }
          img.removeEventListener("error", handleError);
        },
        { once: true }
      );
    });
  }

  function renderItems(grid, items) {
    const countBySource = { instagram: 0, youtube: 0, github: 0 };
    items.forEach((item) => {
      countBySource[item.source] = Number(countBySource[item.source] || 0) + 1;
    });

    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(createCard(item)));
    updateFilterButtons(countBySource);
    attachImageErrorFallback(grid);
  }

  async function initFeeds() {
    const grid = document.getElementById("portfolioGrid");
    if (!grid) return;

    try {
      const items = await loadItems();
      renderItems(grid, items);
    } catch (error) {
      console.error(error);
      grid.innerHTML = "";
      updateFilterButtons({ instagram: 0, youtube: 0, github: 0 });
    }

    if (window.PortfolioGrid?.initIsotope) window.PortfolioGrid.initIsotope();
  }

  document.addEventListener("DOMContentLoaded", initFeeds);
})();
