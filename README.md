# Maniat1k Portfolio

Sitio estatico personal publicado en GitHub Pages.

## Desarrollo local

1. `npm install`
2. `npm run feeds:build`
3. `npm run dev`
4. Abrir `http://localhost:4173`

## Estructura principal

- `index.html`: layout y secciones.
- `css/style.css`: estilos globales.
- `js/script.js`: comportamiento principal (Projects + About/Skills).
- `js/feed-loader.js`: grilla social (Instagram/YouTube/GitHub).
- `js/dev-log.js`: render de commits desde JSON estatico.
- `data/`: fuentes estaticas (`projects.json`, `pinned.json`, `devlog.json`, `github_languages.json`, `github_project_cards.json`, `all.json`).
- `scripts/refresh-github-projects.mjs`: build de datos de GitHub (repos, pinned, commits, skills, cards).
- `scripts/feeds/fetch-feeds.mjs`: build de feeds sociales (Instagram/YouTube) + merge opcional de cards GitHub.
- `.github/workflows/feeds.yml`: automatizacion en Actions.

## Content workflow

### GitHub repos (actualizacion automatica)

- La seccion **Projects** se alimenta de `data/projects.json`.
- El badge **Pinned** se alimenta de `data/pinned.json` (GitHub GraphQL pinnedItems reales).
- El **Dev Log** se alimenta de `data/devlog.json`.
- **Skills/Focus** agrega idiomas de GitHub desde `data/github_languages.json` sin romper la base estatica de LinkedIn.
- El feed **GitHub** (cards) se alimenta de `data/github_project_cards.json`.
- Todo se actualiza con `npm run refresh:github`.

## Feeds sociales

El build `npm run feeds:build` genera:

- `data/instagram.json`
- `data/youtube.json`
- `data/all.json`
- (opcional) merge de `data/github_project_cards.json` dentro de `data/all.json`

Si una fuente externa falla, el frontend mantiene render parcial sin placeholders de error.

## Pipeline en GitHub Actions

El workflow `.github/workflows/feeds.yml` ejecuta:

1. `npm run refresh:github`
2. `npm run refresh:linkedin`
3. `npm run feeds:build`

Y versiona los JSON generados en `data/` para que GitHub Pages sirva contenido estatico y confiable.
