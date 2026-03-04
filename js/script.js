(function($) {

  "use strict";

  var isotopeInstances = [];

  function destroyIsotope() {
    isotopeInstances.forEach(function(instance) {
      instance.$buttonGroup.off(".portfolioFilters");
      if (instance.$grid.data("isotope")) {
        instance.$grid.isotope("destroy");
      }
    });
    isotopeInstances = [];
  }

  $(function() {
    initIsotope();

    if (typeof lightbox !== "undefined") {
      lightbox.option({
        resizeDuration: 200,
        wrapAround: true,
        fitImagesInViewport: true
      });
    }
  });

  // init Isotope
  var initIsotope = function() {
    destroyIsotope();

    $(".grid").each(function() {
      var $grid = $(this);
      var $buttonGroup = $("#filters.button-group");
      if (!$buttonGroup.length) return;

      if (!$grid.find(".portfolio-item").length) return;

      var $checked = $buttonGroup.find(".is-checked");
      var filterValue = $checked.attr("data-filter") || "*";

      $grid.isotope({
        itemSelector: ".portfolio-item",
        filter: filterValue
      });

      $buttonGroup.on("click.portfolioFilters", "a", function(e) {
        e.preventDefault();
        var $button = $(this);
        filterValue = $button.attr("data-filter");
        $grid.isotope({ filter: filterValue });
        $buttonGroup.find(".is-checked").removeClass("is-checked");
        $button.addClass("is-checked");
      });

      isotopeInstances.push({ $grid: $grid, $buttonGroup: $buttonGroup });
    });
  };

  window.PortfolioGrid = {
    initIsotope: initIsotope,
    destroyIsotope: destroyIsotope
  };

})(jQuery);

(function() {
  "use strict";

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    return response.json();
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    return response.text();
  }

  function formatDate(isoDate) {
    if (!isoDate) return "N/A";
    return new Date(isoDate).toLocaleDateString("es-UY", {
      year: "numeric",
      month: "short",
      day: "2-digit"
    });
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
      Dockerfile: "#384d54",
      Jupyter: "#DA5B0B",
      "Jupyter Notebook": "#DA5B0B",
      PHP: "#4F5D95",
      Ruby: "#701516",
      Go: "#00ADD8",
      Rust: "#dea584",
      Java: "#b07219",
      C: "#555555",
      "C++": "#f34b7d",
      "C#": "#178600",
      Vue: "#41b883",
      React: "#61dafb"
    };
    return palette[language] || "#8b949e";
  }

  function buildTagOptions(projects) {
    const set = new Set();
    projects.forEach((project) => {
      if (project.language) set.add("lang:" + project.language);
      (project.topics || []).forEach((topic) => set.add("topic:" + topic));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function projectMatchesFilter(project, filter) {
    if (filter === "all") return true;
    if (filter.startsWith("lang:")) {
      return (project.language || "") === filter.replace("lang:", "");
    }
    if (filter.startsWith("topic:")) {
      const topic = filter.replace("topic:", "");
      return (project.topics || []).includes(topic);
    }
    return true;
  }

  function createProjectCard(project, isPinned) {
    const col = document.createElement("div");
    col.className = "col";

    const safeDescription = project.description || "Sin descripción.";
    const language = project.language || "N/A";
    const languageColor = getLanguageColor(project.language);
    const visibilityBadge = project.private ? "Private" : "Public";
    const updatedLabel = formatDate(project.updated_at);

    col.innerHTML = `
      <article class="project-card ${isPinned ? "pinned-card" : ""} h-100 p-4">
        <header class="repo-card-header mb-3">
          <div class="repo-card-title-wrap">
            <h3 class="repo-card-title mb-0">${project.name}</h3>
          </div>
          <div class="repo-card-badges">
            ${isPinned ? '<span class="badge text-bg-dark">Pinned</span>' : ""}
            <span class="badge text-bg-light border">${visibilityBadge}</span>
          </div>
        </header>

        <p class="repo-card-description mb-3">${safeDescription}</p>

        <p class="repo-card-meta mb-3">
          <span class="repo-meta-item"><span class="repo-lang-dot" style="background-color:${languageColor};"></span>${language}</span>
          <span class="repo-meta-item">★ ${project.stargazers_count}</span>
          <span class="repo-meta-item">Forks ${project.forks_count}</span>
          <span class="repo-meta-item">Updated ${updatedLabel}</span>
        </p>

        <div class="repo-card-footer">
          <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="${project.html_url}" target="_blank" rel="noopener noreferrer">Ver repo</a>
        </div>
      </article>
    `;

    return col;
  }

  async function initProjects() {
    const projectsGrid = document.getElementById("projectsGrid");
    const pinnedGrid = document.getElementById("projectsPinned");
    const filterSelect = document.getElementById("projectFilter");
    const sortSelect = document.getElementById("projectSort");
    const meta = document.getElementById("projectsMeta");

    if (!projectsGrid || !pinnedGrid || !filterSelect || !sortSelect || !meta) return;

    try {
      let projectsPayload = null;
      try {
        projectsPayload = await fetchJson("data/projects.json");
      } catch {
        projectsPayload = window.__PORTFOLIO_PROJECTS__ || null;
      }

      let pinnedPayload = {};
      try {
        pinnedPayload = await fetchJson("data/pinned.json");
      } catch {
        pinnedPayload = { repos: [] };
      }

      if (!projectsPayload || !Array.isArray(projectsPayload.projects)) {
        throw new Error("Projects data not available");
      }

      const rawProjects = Array.isArray(projectsPayload.projects) ? projectsPayload.projects : [];
      const visibleProjects = rawProjects;
      const pinnedRepos = Array.isArray(pinnedPayload?.repos) ? pinnedPayload.repos : [];
      const pinnedSet = new Set(pinnedRepos);

      const filterOptions = buildTagOptions(visibleProjects);
      filterOptions.forEach((option) => {
        const node = document.createElement("option");
        node.value = option;
        node.textContent = option.startsWith("lang:")
          ? option.replace("lang:", "Language: ")
          : option.replace("topic:", "Tag: ");
        filterSelect.appendChild(node);
      });

      function render() {
        const filterValue = filterSelect.value;

        const sorted = [...visibleProjects].sort((a, b) => {
          return new Date(b.updated_at) - new Date(a.updated_at);
        });

        const filtered = sorted.filter((project) => projectMatchesFilter(project, filterValue));

        pinnedGrid.innerHTML = "";
        projectsGrid.innerHTML = "";

        filtered.forEach((project) => {
          const isPinned = pinnedSet.has(project.name);
          projectsGrid.appendChild(createProjectCard(project, isPinned));
        });

        meta.textContent = `${filtered.length} proyectos visibles · Fuente: GitHub API · Última actualización: ${formatDate(projectsPayload.generated_at)}`;
      }

      filterSelect.addEventListener("change", render);
      sortSelect.addEventListener("change", render);
      render();
    } catch (error) {
      pinnedGrid.innerHTML = "";
      projectsGrid.innerHTML = "";
      meta.textContent = "";
      console.error(error);
    }
  }

  function normalizeSkill(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function mergeUniqueSkills(baseSkills, githubLanguages) {
    const seen = new Set();
    const out = [];

    function push(value) {
      const raw = String(value || "").trim();
      if (!raw) return;
      const key = normalizeSkill(raw);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(raw);
    }

    baseSkills.forEach(push);
    githubLanguages.forEach(push);
    return out;
  }

  function parseLinkedInMarkdown(markdown) {
    const sections = {
      headline: "",
      linkedin: "",
      about: "",
      experience: [],
      skills: []
    };

    const lines = markdown.split(/\r?\n/);
    let currentSection = "";
    let currentRole = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("<!--") || trimmed.startsWith("-->")) return;

      if (trimmed === "## Headline") {
        currentSection = "headline";
        currentRole = null;
        return;
      }
      if (trimmed === "## LinkedIn") {
        currentSection = "linkedin";
        currentRole = null;
        return;
      }
      if (trimmed === "## About") {
        currentSection = "about";
        currentRole = null;
        return;
      }
      if (trimmed === "## Experience") {
        currentSection = "experience";
        currentRole = null;
        return;
      }
      if (trimmed === "## Skills") {
        currentSection = "skills";
        currentRole = null;
        return;
      }

      if (currentSection === "experience" && trimmed.startsWith("### ")) {
        const parts = trimmed.replace("### ", "").split("|").map((item) => item.trim());
        currentRole = {
          role: parts[0] || "",
          company: parts[1] || "",
          dates: parts[2] || "",
          bullets: []
        };
        sections.experience.push(currentRole);
        return;
      }

      if (currentSection === "experience" && trimmed.startsWith("- ") && currentRole) {
        currentRole.bullets.push(trimmed.replace("- ", ""));
        return;
      }

      if (currentSection === "skills" && trimmed.startsWith("- ")) {
        sections.skills.push(trimmed.replace("- ", ""));
        return;
      }

      if (currentSection === "headline" && !sections.headline) {
        sections.headline = trimmed;
        return;
      }

      if (currentSection === "linkedin" && !sections.linkedin) {
        sections.linkedin = trimmed;
        return;
      }

      if (currentSection === "about") {
        sections.about += (sections.about ? " " : "") + trimmed;
      }
    });

    return sections;
  }

  async function initLinkedInSection() {
    const headlineNode = document.getElementById("aboutHeadline");
    const summaryNode = document.getElementById("aboutSummary");
    const timelineNode = document.getElementById("experienceTimeline");
    const skillsNode = document.getElementById("skillsList");
    const linkedinButton = document.getElementById("linkedinButton");

    if (!headlineNode || !summaryNode || !timelineNode || !skillsNode || !linkedinButton) return;

    try {
      let markdown = "";
      try {
        markdown = await fetchText("data/linkedin.md");
      } catch {
        markdown = window.__PORTFOLIO_LINKEDIN_MD__ || "";
      }

      if (!markdown) {
        throw new Error("LinkedIn markdown not available");
      }

      const parsed = parseLinkedInMarkdown(markdown);

      if (parsed.headline) headlineNode.textContent = parsed.headline;
      if (parsed.about) summaryNode.textContent = parsed.about;
      if (parsed.linkedin) linkedinButton.href = parsed.linkedin;

      timelineNode.innerHTML = "";
      if (!parsed.experience.length) {
        timelineNode.innerHTML = '<div class="experience-item"><p class="mb-0">Experiencia profesional disponible en el perfil de LinkedIn.</p></div>';
      } else {
        parsed.experience.forEach((item) => {
          const block = document.createElement("article");
          block.className = "experience-item";
          block.innerHTML = `
            <h4 class="h5">${item.role}</h4>
            <p class="mb-2 project-meta">${item.company}${item.dates ? " · " + item.dates : ""}</p>
            <ul class="mb-0">${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
          `;
          timelineNode.appendChild(block);
        });
      }

      skillsNode.innerHTML = "";
      let githubLanguages = [];
      try {
        const payload = await fetchJson("data/github_languages.json");
        const list = Array.isArray(payload?.languages) ? payload.languages : [];
        githubLanguages = list.map((item) => item?.name).filter(Boolean).slice(0, 8);
      } catch {
        githubLanguages = [];
      }

      mergeUniqueSkills(parsed.skills, githubLanguages).forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "project-tag";
        chip.textContent = skill;
        skillsNode.appendChild(chip);
      });
    } catch (error) {
      headlineNode.textContent = "Administrador de Sistemas · DevOps mindset";
      summaryNode.textContent = "Perfil orientado a automatización operativa, QA estructurado y mejora continua de plataformas.";
      timelineNode.innerHTML = "";
      skillsNode.innerHTML = "";
      ["Automatización", "DevOps", "Linux", "PostgreSQL", "Odoo", "QA"].forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "project-tag";
        chip.textContent = skill;
        skillsNode.appendChild(chip);
      });
      console.error(error);
    }
  }

  function initContactButton() {
    const button = document.getElementById("contactButton");
    if (!button) return;

    const userCodes = [109, 97, 110, 105, 97, 116, 49, 107, 115, 116, 101, 114];
    const hostCodes = [103, 109, 97, 105, 108, 46, 99, 111, 109];
    const user = String.fromCharCode.apply(null, userCodes);
    const host = String.fromCharCode.apply(null, hostCodes);
    const mail = `${user}@${host}`;

    button.href = `mailto:${mail}`;
    button.setAttribute("aria-label", "Contactar por correo");
  }

  function initFooterYear() {
    const yearNode = document.getElementById("currentYear");
    if (!yearNode) return;
    yearNode.textContent = String(new Date().getFullYear());
  }

  function initHeroParallax() {
    const image = document.querySelector(".hero-portrait");
    const wrap = document.querySelector(".hero-portrait-wrap");
    if (!image || !wrap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const maxShift = 56;
    const speed = 0.16;
    const wrapStart = wrap.getBoundingClientRect().top + window.scrollY;

    function update() {
      ticking = false;
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 1;
      const anchor = wrapStart - viewportH * 0.45;
      const delta = (window.scrollY - anchor) * speed;
      // Reverse parallax: when page goes down, image moves up.
      const translate = Math.max(-maxShift, Math.min(maxShift, -delta));
      image.style.transform = `translate3d(0, ${translate.toFixed(2)}px, 0) scale(1.12)`;
    }

    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("keydown", function(e) {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "PageUp" || e.key === "PageDown" || e.key === " ") {
        window.requestAnimationFrame(update);
      }
    });
    onScrollOrResize();
  }

  document.addEventListener("DOMContentLoaded", function() {
    initProjects();
    initLinkedInSection();
    initHeroParallax();
    initContactButton();
    initFooterYear();
  });
})();
