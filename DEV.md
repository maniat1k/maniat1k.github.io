# Portfolio Dev Workflow

## Requisitos
- Node.js 18+ (recomendado 20+)

## Actualizar proyectos desde GitHub
1. Ejecuta:
```bash
npm run refresh:github
```
2. Esto actualiza:
- `data/projects.json` (repos públicos de GitHub)
- `data/projects.curated.json` (si no existe, crea `pinned` y `hidden` por defecto)

## Curar proyectos visibles
Edita `data/projects.curated.json`:
- `pinned`: nombres de repos a destacar.
- `hidden`: nombres de repos a ocultar en la sección Projects.

## Editar contenido de LinkedIn (sin scraping)
1. Abre `data/linkedin.md`.
2. Pega/edita:
- Headline
- About
- Experience
- Skills
3. Mantén los encabezados y formato indicados dentro del archivo.

## Preview local
```bash
npm run preview
```
Luego abre `http://localhost:4173`.

## Nota offline
Si no hay red, `refresh:github` mantiene el último `data/projects.json` disponible.
