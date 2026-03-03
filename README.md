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
- `js/script.js`: comportamiento principal (Projects, About, Hero, X embed fallback).
- `js/feed-loader.js`: grilla social (Instagram/YouTube/Reddit/X).
- `js/dev-notes.js`: render de Dev Notes.
- `data/`: fuentes estaticas (`projects.json`, `all.json`, `dev-notes.json`, etc.).
- `scripts/feeds/fetch-feeds.mjs`: build de feeds sociales.
- `.github/workflows/feeds.yml`: automatizacion en Actions.

## Content workflow

### GitHub repos (actualizacion automatica)

- La seccion **Projects** se alimenta de `data/projects.json`.
- Se actualiza con `npm run refresh:github`.
- El repositorio puede ejecutar ese refresco en CI y versionar el JSON para que GitHub Pages sirva contenido estatico.

### X embed (timeline oficial)

- La seccion **Latest on X** usa el widget oficial de X para `@maniat1kUy`.
- El script de widgets se carga en lazy mode cuando la seccion entra en viewport.
- Si el embed falla (bloqueo, offline o script no disponible), se muestra un fallback con mensaje y link al perfil.

Para cambiar usuario o enlace:

- Editar `index.html` en la seccion `#latest-x` (`href` del timeline y del fallback).
- Mantener el mismo `id` de los nodos para no romper la inicializacion en `js/script.js`.

## Feeds sociales

El build `npm run feeds:build` genera:

- `data/instagram.json`
- `data/youtube.json`
- `data/reddit.json`
- `data/x.json`
- `data/all.json`
- assets de imagen en `assets/cards/`

Si una fuente externa falla, el frontend mantiene render parcial y muestra fallback amigable.
