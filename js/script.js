(function($) {

  "use strict";

  var isotopeInstances = [];

  if (!$) {
    window.PortfolioGrid = {
      initIsotope: function() {},
      destroyIsotope: function() {}
    };
    return;
  }

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
        var source = $button.attr("data-source") || "all";
        if (window.PortfolioFeed && typeof window.PortfolioFeed.selectSource === "function") {
          window.PortfolioFeed.selectSource(source);
          return;
        }
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

})(window.jQuery);

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

  function formatCompactHours(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) return "+0";
    if (number >= 1000) {
      const compact = Math.round(number / 1000);
      return `+${compact}K`;
    }
    return `+${Math.round(number)}`;
  }

  function formatPlus(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) return "+0";
    return `+${Math.round(number)}`;
  }

  function applyStatsStripValues(stats) {
    const map = {
      years_experience: formatPlus(stats?.years_experience),
      automations_count: formatPlus(stats?.automations_count),
      analysis_testing_hours: formatCompactHours(stats?.analysis_testing_hours),
      github_projects_count: formatPlus(stats?.github_projects_count)
    };

    Object.entries(map).forEach(([key, value]) => {
      const node = document.querySelector(`[data-stat-key="${key}"]`);
      if (node) node.textContent = value;
    });
  }

  async function initStatsStrip() {
    const strip = document.getElementById("statsStrip");
    if (!strip) return;

    const fallback = {
      years_experience: 15,
      automations_count: 40,
      analysis_testing_hours: 9000,
      github_projects_count: 10
    };

    try {
      const payload = await fetchJson("data/stats.json");
      if (!payload || typeof payload !== "object") {
        applyStatsStripValues(fallback);
        return;
      }
      applyStatsStripValues({
        years_experience: payload.years_experience,
        automations_count: payload.automations_count,
        analysis_testing_hours: payload.analysis_testing_hours,
        github_projects_count: payload.github_projects_count
      });
    } catch {
      applyStatsStripValues(fallback);
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
      headlineNode.textContent = "Jefe de equipo especialista | Administración, análisis funcional y enfoque DevOps";
      summaryNode.textContent = "Lidero equipos y soluciones operativas combinando administración de sistemas, análisis funcional, automatización y mejora continua.";
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
    initStatsStrip();
    initLinkedInSection();
    initHeroParallax();
    initContactButton();
    initFooterYear();
  });
})();
