(function() {
  "use strict";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    return response.json();
  }

  function formatDate(isoDate) {
    const date = new Date(isoDate || "");
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return date.toLocaleDateString("es-UY", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });
  }

  function createTagMarkup(tags) {
    const list = Array.isArray(tags) ? tags : [];
    return list.map((tag) => `<span class="site-chip">${escapeHtml(tag)}</span>`).join("");
  }

  function renderEmptyBlogPage(content) {
    content.innerHTML = `
      <article class="project-card blog-empty-card p-4">
        <h2 class="h4 mb-2">Notas Técnicas</h2>
        <p class="postf mb-0">Aún no hay artículos publicados.</p>
      </article>
    `;
  }

  function renderBlogList(posts, nodes) {
    nodes.eyebrow.textContent = "Archivo";
    nodes.title.textContent = "Notas Técnicas";
    nodes.lead.textContent = "Artículos técnicos escritos en Markdown y publicados desde el mismo flujo estático del portfolio.";
    document.title = "Notas Técnicas | maniat1k";

    nodes.content.innerHTML = `
      <div class="blog-list">
        ${posts
          .map(
            (post) => `
              <a class="blog-list-card" href="${escapeHtml(post.url)}">
                <article class="project-card h-100 p-4">
                  <p class="project-meta mb-2">${formatDate(post.date)}</p>
                  <h2 class="h4 mb-3">${escapeHtml(post.title)}</h2>
                  <p class="postf mb-3 blog-summary">${escapeHtml(post.summary)}</p>
                  <div class="d-flex flex-wrap gap-2 mb-4 ${post.tags?.length ? "" : "d-none"}">
                    ${createTagMarkup(post.tags)}
                  </div>
                  <span class="btn btn-primary btn-sm text-uppercase text-decoration-none align-self-start">Leer completo</span>
                </article>
              </a>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderPostDetail(post, nodes) {
    nodes.eyebrow.textContent = "Nota Técnica";
    nodes.title.textContent = post.title || "Artículo";
    nodes.lead.textContent = post.summary || "";
    document.title = `${post.title} | Notas Técnicas | maniat1k`;

    nodes.content.innerHTML = `
      <article class="project-card p-4 p-lg-5">
        <div class="d-flex flex-wrap gap-3 align-items-center mb-4">
          <a class="btn btn-outline-dark btn-sm text-uppercase text-decoration-none" href="blog.html">Volver</a>
          <a class="btn btn-outline-dark btn-sm text-uppercase text-decoration-none" href="index.html">Inicio</a>
          <p class="project-meta mb-0">${formatDate(post.date)}</p>
        </div>
        <div class="d-flex flex-wrap gap-2 mb-4 ${post.tags?.length ? "" : "d-none"}">
          ${createTagMarkup(post.tags)}
        </div>
        <div class="blog-prose">${post.html || ""}</div>
      </article>
    `;
  }

  function renderPostNotFound(nodes) {
    nodes.eyebrow.textContent = "Notas Técnicas";
    nodes.title.textContent = "Artículo no encontrado";
    nodes.lead.textContent = "El enlace no coincide con ninguna nota técnica publicada.";
    document.title = "Artículo no encontrado | maniat1k";
    nodes.content.innerHTML = `
      <article class="project-card blog-empty-card p-4">
        <p class="postf mb-3">Revisa el enlace o vuelve al listado completo.</p>
        <a class="btn btn-primary btn-sm text-uppercase text-decoration-none" href="blog.html">Ver notas técnicas</a>
      </article>
    `;
  }

  function initBlogPage(payload) {
    const page = document.getElementById("blogPage");
    if (!page) return;

    const nodes = {
      eyebrow: document.getElementById("blogPageEyebrow"),
      title: document.getElementById("blogPageTitle"),
      lead: document.getElementById("blogPageLead"),
      content: document.getElementById("blogPageContent")
    };

    if (!nodes.eyebrow || !nodes.title || !nodes.lead || !nodes.content) return;

    const posts = Array.isArray(payload?.posts) ? payload.posts : [];
    if (!posts.length) {
      renderEmptyBlogPage(nodes.content);
      return;
    }

    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      renderBlogList(posts, nodes);
      return;
    }

    const post = posts.find((item) => item.slug === slug);
    if (!post) {
      renderPostNotFound(nodes);
      return;
    }

    renderPostDetail(post, nodes);
  }

  async function initBlog() {
    const needsBlogData = Boolean(document.getElementById("blogPage"));

    if (!needsBlogData) return;

    try {
      const payload = await fetchJson("data/blog.json");
      initBlogPage(payload);
    } catch (error) {
      console.error(error);
      initBlogPage({ posts: [] });
    }
  }

  document.addEventListener("DOMContentLoaded", initBlog);
})();
