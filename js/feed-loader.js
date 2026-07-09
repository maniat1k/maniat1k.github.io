(function() {
  "use strict";

  const SOURCE_LABELS = {
    all: "Todos",
    instagram: "Instagram",
    youtube: "YouTube",
    blog: "Blog",
    "github-projects": "GitHub Proyectos",
    "github-log": "GitHub Log"
  };

  const GITHUB_USER = "maniat1k";
  const MAX_GITHUB_LOG_ITEMS = 12;
  const GITHUB_COMMITS_PER_REPO = 5;
  const githubRepos = [
    { name: "maniat1k.github.io", type: "principal" },
    { name: "maniat1k", type: "principal" },
    { name: "wintop", type: "principal" },
    { name: "nido", type: "principal" },
    { name: "Clean_windows", type: "principal" },
    { name: "SlimWin-", type: "principal" },
    { name: "maniat1k-brand", type: "historico" },
    { name: "Solarizedxterm", type: "historico" },
    { name: "windows11_fixMBR", type: "historico" },
    { name: "birame", type: "historico" },
    { name: "savevm", type: "historico" }
  ];

  const Fallback = {
    blogItems: [
      {
        type: "blog",
        source: "blog",
        title: "De una calculadora de ahorro a una herramienta de diagnostico financiero",
        date: "2026-06-10T00:00:00.000Z",
        description: "Como una calculadora simple evoluciono hacia una herramienta para entender mejor las finanzas personales.",
        url: "blog.html?slug=2026-06-10-De%20una%20calculadora%20de%20ahorro%20a%20una%20herramienta%20de%20diagnostico%20financiero",
        tags: ["javascript", "finanzas", "proyectos"]
      },
      {
        type: "blog",
        source: "blog",
        title: "Donde seguir y aprender DevOps en 2026",
        date: "2026-06-09T00:00:00.000Z",
        description: "Recursos y orientacion para aprender DevOps sin perderse en el ruido.",
        url: "blog.html?slug=2026-06-09-Donde%20seguir%20y%20aprender%20DevOps",
        tags: ["devops", "aprendizaje", "recursos"]
      }
    ],
    githubProjectItems: [
      {
        type: "github-projects",
        source: "github-projects",
        title: "maniat1k.github.io",
        date: "2026-06-12T09:53:23Z",
        description: "Portfolio personal estatico con datos generados y contenido tecnico.",
        url: "https://github.com/maniat1k/maniat1k.github.io",
        language: "JavaScript",
        tags: ["JavaScript"]
      },
      {
        type: "github-projects",
        source: "github-projects",
        title: "savevm",
        date: "2026-03-01T14:12:41Z",
        description: "Scripts para guardar estado de VMs de VirtualBox antes de apagar el host.",
        url: "https://github.com/maniat1k/savevm",
        language: "Shell",
        tags: ["Shell", "VirtualBox"]
      }
    ],
    githubLogItems: [
      {
        type: "github-log",
        source: "github-log",
        title: "chore: refresh site data",
        date: "2026-06-12T09:53:18Z",
        description: "maniat1k.github.io",
        repo: "maniat1k.github.io",
        repoType: "principal",
        url: "https://github.com/maniat1k/maniat1k.github.io/commit/ab7b1db6b49fa5d215f66b68846e4a5241ab7446"
      },
      {
        type: "github-log",
        source: "github-log",
        title: "Revise README structure and update tool icons",
        date: "2026-06-10T19:47:14Z",
        description: "maniat1k",
        repo: "maniat1k",
        repoType: "principal",
        url: "https://github.com/maniat1k/maniat1k/commit/10fa9c5c06d6da3b1ee55404316e9c3e197f9b32"
      }
    ]
  };

  const AUTOMATED_COMMIT_PREFIXES = ["chore:", "ci:", "build:", "bot:"];
  const AUTOMATED_COMMIT_PARTS = ["refresh site data", "update generated data", "automated", "github-actions"];

  const state = {
    activeSource: "all",
    socialItems: [],
    blogItems: [],
    githubProjectItems: [],
    githubLogItems: [],
    projectFilter: "all",
    projectSort: "updated",
    blogSort: "desc",
    blogTag: "all"
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("es-UY", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
  }

  function sortByDate(items) {
    return [...items].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    return response.json();
  }

  function getRepoConfig(repoName) {
    return githubRepos.find((repo) => repo.name.toLowerCase() === String(repoName || "").toLowerCase()) || null;
  }

  function normalizeImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
    if (value.startsWith("/")) return value.slice(1);
    return value;
  }

  function getLocalSocialImage(raw, source) {
    const id = String(raw?.id || "").trim();
    const map = {
      instagram_5d9842018864: "assets/cards/instagram_instagram_5d9842018864.jpg",
      instagram_aca8cbbca2ff: "assets/cards/instagram_instagram_aca8cbbca2ff.jpg",
      youtube_9a6352225010: "assets/cards/youtube_youtube_9a6352225010.jpg",
      youtube_dcc0333943a9: "assets/cards/youtube_youtube_dcc0333943a9.jpg"
    };
    if (id && map[id]) return map[id];
    return `assets/fallback/${source}-1.svg`;
  }

  function getSocialImage(raw, source) {
    const localImage = getLocalSocialImage(raw, source);
    if (!localImage.includes("/fallback/")) return localImage;
    const image = normalizeImageUrl(raw?.image);
    if (image) return image;
    return localImage;
  }

  function normalizeSocialItem(raw) {
    const source = String(raw?.source || "").toLowerCase();
    if (source !== "instagram" && source !== "youtube") return null;
    if (!raw?.url) return null;

    return {
      type: source,
      source,
      title: String(raw.title || source),
      date: String(raw.date || raw.updated_at || ""),
      description: String(raw.summary || raw.title || ""),
      url: String(raw.url),
      image: getSocialImage(raw, source),
      image_alt: String(raw.image_alt || raw.title || source),
      tags: [],
      id: String(raw.id || "")
    };
  }

  function normalizeBlogPost(post) {
    if (!post?.url) return null;
    return {
      type: "blog",
      source: "blog",
      title: String(post.title || "Post del blog"),
      date: String(post.date || ""),
      description: String(post.summary || ""),
      url: String(post.url),
      tags: Array.isArray(post.tags) ? post.tags.map(String) : []
    };
  }

  function normalizeKofiPost(post) {
    if (!post?.url) return null;
    const image = normalizeImageUrl(post.image);
    return {
      type: "kofi",
      source: "kofi",
      label: String(post.label || "KO-FI"),
      title: String(post.title || "Post en Ko-fi"),
      date: String(post.date || ""),
      description: String(post.description || post.summary || ""),
      url: String(post.url),
      image: /^(https?:)?\/\//i.test(image) ? "" : image,
      tags: Array.isArray(post.tags) ? post.tags.map(String) : []
    };
  }

  function normalizeProject(project) {
    if (!project?.html_url && !project?.url) return null;
    const language = String(project.language || "");
    const topics = Array.isArray(project.topics) ? project.topics.map(String) : [];
    return {
      type: "github-projects",
      source: "github-projects",
      title: String(project.name || project.title || "Repositorio GitHub"),
      date: String(project.updated_at || project.date || ""),
      description: String(project.description || project.summary || "Repositorio publico en GitHub."),
      url: String(project.html_url || project.url),
      language,
      stars: Number(project.stargazers_count || project.stars || 0),
      forks: Number(project.forks_count || project.forks || 0),
      tags: [language].concat(topics).filter(Boolean)
    };
  }

  function normalizeCommit(commit) {
    if (!commit?.url) return null;
    const repo = String(commit.repo || commit.description || "");
    const repoConfig = getRepoConfig(repo);
    return {
      type: "github-log",
      source: "github-log",
      title: String(commit.message || commit.title || "Commit publico"),
      date: String(commit.date || ""),
      description: repo || "Actividad reciente en GitHub",
      repo: repo || "GitHub",
      repoType: String(commit.repoType || commit.type || repoConfig?.type || "principal"),
      url: String(commit.url),
      tags: [repo, commit.repoType || commit.type || repoConfig?.type].filter(Boolean).map(String)
    };
  }

  function normalizeGitHubApiCommit(commit, repoConfig) {
    const message = String(commit?.commit?.message || "").split("\n")[0].trim();
    const url = String(commit?.html_url || "");
    if (!message || !url) return null;
    return normalizeCommit({
      repo: repoConfig.name,
      repoType: repoConfig.type,
      message,
      date: commit?.commit?.committer?.date || commit?.commit?.author?.date || "",
      url
    });
  }

  function isAutomatedCommitItem(item) {
    const text = `${item?.title || ""} ${item?.description || ""}`.toLowerCase();
    return AUTOMATED_COMMIT_PREFIXES.some((prefix) => text.trim().startsWith(prefix)) ||
      AUTOMATED_COMMIT_PARTS.some((part) => text.includes(part));
  }

  async function loadSocialItems() {
    const itemsById = new Map();
    const addItems = (items) => {
      items.forEach((item) => {
        const key = item.id || `${item.source}:${item.url}`;
        if (!itemsById.has(key)) itemsById.set(key, item);
      });
    };

    try {
      const [instagramPayload, youtubePayload, allPayload] = await Promise.allSettled([
        fetchJson("data/instagram.json"),
        fetchJson("data/youtube.json"),
        fetchJson("data/all.json")
      ]);

      [instagramPayload, youtubePayload, allPayload].forEach((result) => {
        if (result.status !== "fulfilled") return;
        addItems((result.value?.items || []).map(normalizeSocialItem).filter(Boolean));
      });

      const items = Array.from(itemsById.values());
      if (items.length) return sortByDate(items);
      throw new Error("No social items available");
    } catch {
      return [
        {
          type: "instagram",
          source: "instagram",
          title: "Instagram",
          date: new Date().toISOString(),
          description: "Contenido reciente de Instagram.",
          url: "https://www.instagram.com/maniat1k/",
          image: "assets/cards/instagram_instagram_5d9842018864.jpg",
          image_alt: "Instagram"
        },
        {
          type: "youtube",
          source: "youtube",
          title: "YouTube",
          date: new Date().toISOString(),
          description: "Contenido reciente de YouTube.",
          url: "https://www.youtube.com/@maniat1kUy",
          image: "assets/cards/youtube_youtube_9a6352225010.jpg",
          image_alt: "YouTube"
        }
      ];
    }
  }

  async function loadBlogItems() {
    try {
      const [blogPayload, kofiPayload] = await Promise.allSettled([
        fetchJson("data/blog.json"),
        fetchJson("data/kofi-posts.json")
      ]);

      const localPosts = blogPayload.status === "fulfilled" ? blogPayload.value?.posts || [] : [];
      const kofiPostsPayload = kofiPayload.status === "fulfilled" ? kofiPayload.value : [];
      const kofiPosts = Array.isArray(kofiPostsPayload) ? kofiPostsPayload : kofiPostsPayload?.posts || [];
      const items = [
        ...localPosts.map(normalizeBlogPost),
        ...kofiPosts.map(normalizeKofiPost)
      ].filter(Boolean);

      return items.length ? sortByDate(items) : Fallback.blogItems;
    } catch {
      return Fallback.blogItems;
    }
  }

  async function loadGithubProjectItems() {
    try {
      const payload = await fetchJson("data/projects.json");
      const items = (payload?.projects || []).map(normalizeProject).filter(Boolean);
      return items.length ? sortByDate(items) : Fallback.githubProjectItems;
    } catch {
      return Fallback.githubProjectItems;
    }
  }

  async function loadGithubLogItems() {
    const localItemsPromise = fetchJson("data/devlog.json")
      .then((payload) => (payload?.items || []).map(normalizeCommit).filter(Boolean))
      .catch(() => Fallback.githubLogItems.map(normalizeCommit).filter(Boolean));

    try {
      const requests = githubRepos.map((repo) => {
        const url = `https://api.github.com/repos/${GITHUB_USER}/${encodeURIComponent(repo.name)}/commits?per_page=${GITHUB_COMMITS_PER_REPO}`;
        return fetchJson(url).then((payload) => ({ repo, payload }));
      });

      const results = await Promise.allSettled(requests);
      const liveItems = results.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        const payload = Array.isArray(result.value.payload) ? result.value.payload : [];
        return payload.map((commit) => normalizeGitHubApiCommit(commit, result.value.repo)).filter(Boolean);
      });

      const items = sortByDate(liveItems.filter((item) => !isAutomatedCommitItem(item))).slice(0, MAX_GITHUB_LOG_ITEMS);
      if (items.length) return items;

      const localItems = await localItemsPromise;
      return sortByDate(localItems.filter((item) => !isAutomatedCommitItem(item))).slice(0, MAX_GITHUB_LOG_ITEMS);
    } catch {
      const localItems = await localItemsPromise;
      return sortByDate(localItems.filter((item) => !isAutomatedCommitItem(item))).slice(0, MAX_GITHUB_LOG_ITEMS);
    }
  }

  function getLanguageColor(language) {
    const palette = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      Python: "#3572A5",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Shell: "#89e051",
      PowerShell: "#012456",
      Dart: "#00B4AB"
    };
    return palette[language] || "#8b949e";
  }

  function getAllItems() {
    return sortByDate([
      ...state.blogItems,
      ...state.githubProjectItems,
      ...state.githubLogItems
    ]).slice(0, 8);
  }

  function projectMatchesFilter(item) {
    if (state.projectFilter === "all") return true;
    return item.tags.some((tag) => `tag:${tag}` === state.projectFilter || `lang:${tag}` === state.projectFilter);
  }

  function getVisibleItems() {
    if (state.activeSource === "all") return sortByDate(getAllItems());
    if (state.activeSource === "blog") {
      const filtered = state.blogTag === "all"
        ? state.blogItems
        : state.blogItems.filter((item) => item.tags.includes(state.blogTag));
      const sorted = sortByDate(filtered);
      return state.blogSort === "asc" ? sorted.reverse() : sorted;
    }
    if (state.activeSource === "github-log") return sortByDate(state.githubLogItems);
    if (state.activeSource === "github-projects") {
      const filtered = state.githubProjectItems.filter(projectMatchesFilter);
      if (state.projectSort === "stars") return [...filtered].sort((a, b) => Number(b.stars || 0) - Number(a.stars || 0));
      return sortByDate(filtered);
    }
    return sortByDate(state.socialItems.filter((item) => item.source === state.activeSource));
  }

  function createSocialCard(item) {
    const image = normalizeImageUrl(item.image) || `assets/fallback/${item.source}-1.svg`;
    return `
      <div class="col mb-4 portfolio-item ${escapeHtml(item.source)}">
        <article class="project-card feed-card h-100">
          <a href="${escapeHtml(item.url)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer" class="d-block text-decoration-none feed-card-media overflow-hidden position-relative">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(item.image_alt || item.title)}" data-source="${escapeHtml(item.source)}" class="img-fluid" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
            <div class="media-overlay-band d-flex align-items-end justify-content-between p-3">
              <p class="feed-media-label mb-0">${SOURCE_LABELS[item.source]}</p>
              <svg class="feed-media-icon" width="20" height="20" aria-hidden="true" focusable="false">
                <use xlink:href="#${escapeHtml(item.source)}"></use>
              </svg>
            </div>
          </a>
          <div class="feed-card-body p-3 p-xl-4 d-flex flex-column">
            <div class="card-source-row mb-2">
              <span class="source-badge source-badge-${escapeHtml(item.source)}">${SOURCE_LABELS[item.source]}</span>
              <span class="project-meta">${formatDate(item.date)}</span>
            </div>
            <p class="postf small mb-0 feed-summary">${escapeHtml(item.description)}</p>
          </div>
        </article>
      </div>
    `;
  }

  function createBlogCard(item) {
    const source = item.source === "kofi" ? "kofi" : "blog";
    const label = item.source === "kofi" ? (item.label || "KO-FI") : "BLOG ORIGINAL";
    const linkAttrs = item.source === "kofi" ? ' target="_blank" rel="noopener noreferrer"' : "";
    const media = source === "kofi" && item.image ? `
      <a href="${escapeHtml(item.url)}" title="${escapeHtml(item.title)}"${linkAttrs} class="d-block text-decoration-none feed-card-media kofi-card-media overflow-hidden position-relative">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" data-source="kofi" class="img-fluid" loading="lazy">
        <div class="media-overlay-band d-flex align-items-end justify-content-between p-3">
          <span class="feed-media-label">KO-FI</span>
          <svg class="feed-media-icon" width="20" height="20" aria-hidden="true" focusable="false">
            <use href="#kofi"></use>
          </svg>
        </div>
      </a>
    ` : "";
    return `
      <div class="col mb-4 portfolio-item blog ${escapeHtml(source)}">
        <article class="project-card blog-feed-card h-100${media ? " overflow-hidden" : " p-4"}">
          ${media}
          <div class="${media ? "p-4 d-flex flex-column flex-grow-1" : "d-flex flex-column flex-grow-1"}">
            <div class="card-source-row mb-3">
              <span class="source-badge source-badge-${escapeHtml(source)}">${escapeHtml(label)}</span>
              <span class="project-meta">${formatDate(item.date)}</span>
            </div>
            <h3 class="repo-card-title mb-3">${escapeHtml(item.title)}</h3>
            <p class="postf mb-3 feed-summary">${escapeHtml(item.description || "Post publicado en el blog.")}</p>
            ${createTags(item.tags)}
            <div class="repo-card-footer">
              <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${escapeHtml(item.url)}"${linkAttrs}>Leer post</a>
            </div>
          </div>
        </article>
      </div>
    `;
  }

  function createProjectCard(item) {
    const language = item.language || "N/A";
    return `
      <div class="col mb-4 portfolio-item github-projects">
        <article class="project-card github-feed-project-card h-100 p-4">
          <div class="repo-card-bg-mark" aria-hidden="true">
            <svg width="140" height="140" viewBox="0 0 24 24" focusable="false">
              <use xlink:href="#github"></use>
            </svg>
          </div>
          <header class="repo-card-header mb-3">
            <div class="repo-card-title-wrap">
              <div class="card-source-row mb-2">
                <span class="source-badge source-badge-github">GITHUB</span>
                <span class="project-meta">${formatDate(item.date)}</span>
              </div>
              <h3 class="repo-card-title mb-0">${escapeHtml(item.title)}</h3>
            </div>
            <div class="repo-card-badges">
              <span class="badge text-bg-light border">Public</span>
            </div>
          </header>
          <p class="repo-card-description mb-3">${escapeHtml(item.description)}</p>
          <p class="repo-card-meta mb-3">
            <span class="repo-meta-item"><span class="repo-lang-dot" style="background-color:${getLanguageColor(language)};"></span>${escapeHtml(language)}</span>
            <span class="repo-meta-item">★ ${Number(item.stars || 0)}</span>
            <span class="repo-meta-item">Forks ${Number(item.forks || 0)}</span>
            <span class="repo-meta-item">Updated ${formatDate(item.date)}</span>
          </p>
          <div class="repo-card-footer">
            <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver repo</a>
          </div>
        </article>
      </div>
    `;
  }

  function createCommitCard(item) {
    const repoType = item.repoType === "historico" ? "historico" : "principal";
    const repoLabel = repoType === "historico" ? "Histórico" : "Principal";
    return `
      <div class="col mb-4 portfolio-item github-log">
        <article class="project-card github-log-card h-100 p-4">
          <div class="repo-card-bg-mark" aria-hidden="true">
            <svg width="128" height="128" viewBox="0 0 24 24" focusable="false">
              <use xlink:href="#github"></use>
            </svg>
          </div>
          <div class="card-source-row mb-3">
            <span class="source-badge source-badge-github">GITHUB LOG</span>
            <span class="project-meta">${formatDate(item.date)}</span>
          </div>
          <div class="github-log-repo-row mb-2">
            <span class="site-chip github-log-repo-chip">${escapeHtml(item.repo || item.description)}</span>
            <span class="site-chip github-log-type-chip github-log-type-${escapeHtml(repoType)}">${repoLabel}</span>
          </div>
          <h3 class="h6 mb-2">${escapeHtml(item.title)}</h3>
          <div class="repo-card-footer">
            <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Ver commit</a>
          </div>
        </article>
      </div>
    `;
  }

  function createTags(tags) {
    const list = Array.isArray(tags) ? tags.slice(0, 4) : [];
    if (!list.length) return "";
    return `
      <div class="d-flex flex-wrap gap-2 mb-4">
        ${list.map((tag) => `<span class="site-chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
    `;
  }

  function createCard(item) {
    if (item.source === "instagram" || item.source === "youtube") return createSocialCard(item);
    if (item.source === "blog" || item.source === "kofi") return createBlogCard(item);
    if (item.source === "github-projects") return createProjectCard(item);
    if (item.source === "github-log") return createCommitCard(item);
    return "";
  }

  function renderCards(items) {
    const grid = document.getElementById("portfolioGrid");
    const controls = document.getElementById("githubProjectControls");
    const blogControls = document.getElementById("blogControls");
    if (!grid) return;

    grid.innerHTML = items.map(createCard).join("");
    if (controls) controls.classList.toggle("d-none", state.activeSource !== "github-projects");
    if (blogControls) blogControls.classList.toggle("d-none", state.activeSource !== "blog");

    grid.querySelectorAll("img[data-source]").forEach((img) => {
      img.addEventListener("error", () => {
        const wrapper = img.closest(".feed-card-media");
        if (wrapper?.classList.contains("kofi-card-media")) {
          wrapper.remove();
          return;
        }
        if (wrapper) wrapper.innerHTML = '<div class="feed-empty-frame" aria-hidden="true"></div>';
      }, { once: true });
    });
  }

  function updateButtons() {
    const filters = document.getElementById("filters");
    if (!filters) return;
    filters.querySelectorAll("a[data-source]").forEach((button) => {
      const source = button.getAttribute("data-source");
      button.classList.toggle("is-checked", source === state.activeSource);
    });
  }

  function updateMeta(items) {
    const meta = document.getElementById("portfolioMeta");
    if (!meta) return;
    if (state.activeSource === "all") {
      meta.textContent = "Mix compacto del Laboratorio Digital.";
    } else if (state.activeSource === "github-projects") {
      meta.textContent = `${items.length} proyectos visibles`;
    } else if (state.activeSource === "github-log") {
      meta.textContent = `${items.length} commits visibles`;
    } else if (state.activeSource === "blog") {
      meta.textContent = `${items.length} posts visibles`;
    } else {
      meta.textContent = `${items.length} items de ${SOURCE_LABELS[state.activeSource] || "contenido"}`;
    }
  }

  function renderCurrentView() {
    const items = getVisibleItems();
    renderCards(items);
    updateButtons();
    updateMeta(items);
    if (window.PortfolioGrid?.initIsotope) window.PortfolioGrid.initIsotope();
  }

  function setupFilterButtons() {
    const filters = document.getElementById("filters");
    if (!filters) return;
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("a[data-source]");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      state.activeSource = button.getAttribute("data-source") || "all";
      renderCurrentView();
    });
  }

  function setupProjectControls() {
    const filterSelect = document.getElementById("projectFilter");
    const sortSelect = document.getElementById("projectSort");
    if (!filterSelect || !sortSelect) return;

    filterSelect.innerHTML = '<option value="all">Todos</option>';
    const tags = new Set();
    state.githubProjectItems.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));
    Array.from(tags).sort((a, b) => a.localeCompare(b)).forEach((tag) => {
      const option = document.createElement("option");
      option.value = `tag:${tag}`;
      option.textContent = tag;
      filterSelect.appendChild(option);
    });

    if (!sortSelect.querySelector('option[value="stars"]')) {
      const option = document.createElement("option");
      option.value = "stars";
      option.textContent = "Mas estrellas";
      sortSelect.appendChild(option);
    }

    filterSelect.addEventListener("change", () => {
      state.projectFilter = filterSelect.value;
      renderCurrentView();
    });

    sortSelect.addEventListener("change", () => {
      state.projectSort = sortSelect.value;
      renderCurrentView();
    });
  }

  function setupBlogControls() {
    const sortSelect = document.getElementById("blogSort");
    const tagCloud = document.getElementById("blogTagCloud");
    if (!sortSelect || !tagCloud) return;

    const tags = new Set();
    state.blogItems.forEach((item) => item.tags.forEach((tag) => tags.add(tag)));

    function createTagButton(value, label) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "site-chip blog-tag-chip";
      button.dataset.blogTag = value;
      button.textContent = label;
      return button;
    }

    tagCloud.innerHTML = "";
    tagCloud.appendChild(createTagButton("all", "Todos los tags"));
    Array.from(tags).sort((a, b) => a.localeCompare(b)).forEach((tag) => {
      tagCloud.appendChild(createTagButton(tag, tag));
    });

    function updateTagButtons() {
      tagCloud.querySelectorAll("[data-blog-tag]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.blogTag === state.blogTag);
      });
    }

    sortSelect.addEventListener("change", () => {
      state.blogSort = sortSelect.value;
      renderCurrentView();
    });

    tagCloud.addEventListener("click", (event) => {
      const button = event.target.closest("[data-blog-tag]");
      if (!button) return;
      state.blogTag = button.dataset.blogTag || "all";
      updateTagButtons();
      renderCurrentView();
    });

    updateTagButtons();
  }

  async function initFeeds() {
    const grid = document.getElementById("portfolioGrid");
    if (!grid) return;

    const [socialItems, blogItems, githubProjectItems, githubLogItems] = await Promise.all([
      loadSocialItems(),
      loadBlogItems(),
      loadGithubProjectItems(),
      loadGithubLogItems()
    ]);

    state.socialItems = socialItems;
    state.blogItems = blogItems;
    state.githubProjectItems = githubProjectItems;
    state.githubLogItems = githubLogItems;

    const blogNavItem = document.getElementById("blogNavItem");
    if (blogNavItem) blogNavItem.classList.toggle("d-none", !state.blogItems.length);

    setupFilterButtons();
    setupProjectControls();
    setupBlogControls();
    renderCurrentView();
  }

  window.PortfolioFeed = {
    selectSource(source) {
      state.activeSource = SOURCE_LABELS[source] ? source : "all";
      renderCurrentView();
      return true;
    },
    renderCards
  };

  document.addEventListener("DOMContentLoaded", initFeeds);
})();
