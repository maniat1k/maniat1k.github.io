# Portfolio Dev Workflow

## Requisitos
- Node.js 18+ (recomendado 20+)

## Actualizar datos desde GitHub
1. Ejecuta:
```bash
npm run refresh:github
```
2. Esto actualiza:
- `data/projects.json` (repos públicos)
- `data/pinned.json` (pinnedItems reales via GraphQL)
- `data/devlog.json` (últimos commits filtrados)
- `data/github_languages.json` (idiomas más usados)
- `data/github_project_cards.json` (4 cards GitHub para la grilla)

## Build de feeds sociales
```bash
npm run feeds:build
```
Genera:
- `data/instagram.json`
- `data/youtube.json`
- `data/all.json` (incluye cards GitHub si `github_project_cards.json` existe)

## Editar contenido de LinkedIn (sin scraping)
1. Abre `data/linkedin.md`.
2. Pega/edita:
- Headline
- About
- Experience
- Skills
3. Mantén los encabezados y formato indicados dentro del archivo.

## Refresh completo
```bash
npm run refresh:data
```

## Preview local
```bash
npm run preview
```
Luego abre `http://localhost:4173`.

## Nota offline
Si no hay red o falla una fuente, se mantienen los JSON existentes y el frontend oculta bloques vacíos sin errores visibles.
