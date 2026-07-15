# AGENTS.md

## Propósito del portal

Este repositorio contiene el portal personal de Maniat1k. El sitio debe funcionar como un activo digital de bajo mantenimiento para:

- Construir comunidad.
- Reforzar posicionamiento profesional.
- Reutilizar trabajo técnico y contenido ya publicado.
- Mostrar proyectos, herramientas y experiencia pública.
- Convertir visitas hacia Ko-fi, GitHub, productos digitales o servicios.
- Generar ingresos complementarios sin aumentar innecesariamente la carga operativa.

Al proponer o implementar cambios, priorizar siempre impacto medible sobre cambios cosméticos.

## Criterios de decisión

Evaluar mejoras según estos criterios:

- Más visitas o mejor descubrimiento.
- Mejor demostración de expertise.
- Mayor reutilización de contenido existente.
- Mejor conversión hacia Ko-fi, GitHub, productos o servicios.
- Potencial de ingresos complementarios.
- Menos trabajo manual.
- Más confiabilidad.
- Mejor medición.
- Menor complejidad de mantenimiento.

Evitar cambios que agreguen complejidad sin una ganancia clara.

## Roles de los componentes

- GitHub es la fuente principal para proyectos técnicos, código público y prueba de expertise.
- Ko-fi es la fuente principal de publicaciones monetizables y monetización.
- Ko-fi ya ofrece publicación y sharing nativo hacia X/Twitter; no crear automatización propia para publicar en X mientras esa función cubra la necesidad.
- X/Twitter funciona como canal de atención y distribución, no como fuente primaria del portal.
- El portal funciona como catálogo, presentación y showcase. Agrega contenido desde GitHub, Ko-fi y otras fuentes.
- El blog local es secundario.
- Evitar duplicar manualmente el mismo contenido entre Ko-fi, portal y X.

## Plataforma y arquitectura

- GitHub Pages debe seguir siendo el hosting del sitio.
- No introducir CMS.
- No agregar nuevas plataformas, servicios externos o dependencias sin justificar valor, mantenimiento y riesgo.
- Mantener el sitio como una experiencia estática, simple y portable.
- Reutilizar el diseño, renderers, scripts y componentes existentes antes de crear estructuras nuevas.
- No realizar reconstrucciones visuales completas salvo pedido explícito del owner.
- Mantener el código modular, responsive, mínimo y mantenible.

## Contenido y URLs

- No crear páginas HTML individuales por cada artículo local.
- Preservar el flujo actual del blog local mediante `blog.html?slug=...`.
- Mantener compatibilidad con URLs existentes siempre que sea posible.
- No duplicar publicaciones de Ko-fi como posts locales salvo pedido explícito.
- El contenido local en Markdown debe seguir siendo secundario frente a Ko-fi.
- El GitHub Log puede existir como apartado propio, pero no debe mezclarse en vistas generales pensadas para vender o presentar contenido principal.

## Datos completos y selecciones visuales

- Las recopilaciones completas, como `projects.json`, estadísticas, lenguajes y GitHub Log, deben conservar todos los repositorios válidos.
- Las exclusiones editoriales de portada deben aplicarse en la lógica de selección o renderizado de la vista correspondiente.
- No eliminar datos globalmente para ocultar una tarjeta en una vista concreta.
- Los filtros específicos deben seguir operando sobre su fuente completa salvo pedido explícito.
- Mantener intactos el límite y el criterio de orden de una selección al excluir elementos, salvo que el owner solicite cambiarlos.

## Fuentes de datos y archivos generados

Distinguir entre archivos fuente o manuales y archivos generados.

Archivos fuente o editables manualmente incluyen, entre otros:

- `index.html`
- páginas HTML raíz
- `css/*.css`
- `js/*.js`
- `blog/*.md`
- `data/*.manual.json`
- `data/profile_metrics.json`
- `data/automations.json`
- `data/linkedin.md`
- archivos de configuración y documentación

Archivos generados incluyen, entre otros:

- `data/blog.json`
- `data/kofi-posts.json`
- `data/all.json`
- `data/all.data.js`
- `data/projects.json`
- `data/projects.data.js`
- `data/pinned.json`
- `data/devlog.json`
- `data/github_languages.json`
- `data/github_project_cards.json`
- `data/instagram.json`
- `data/youtube.json`
- `data/stats.json`
- `data/linkedin.data.js`
- `assets/images/kofi/**`

No editar manualmente archivos generados si existe un script que puede producir correctamente el cambio. Cambiar el script fuente y regenerar.

Si una fuente externa no está disponible, no simular una regeneración completa ni sobrescribir otras recopilaciones con datos parciales. Reportar la limitación y preservar los datos existentes cuando sea posible.

## Automatización

- La automatización nunca debe sobrescribir ni borrar contenido manual no relacionado.
- Si un fetch externo falla, preservar los datos existentes cuando el sistema lo permita.
- Las fallas parciales de fuentes externas no deben romper toda la generación si hay fallback razonable.
- Para Ko-fi, descargar y cachear imágenes localmente en lugar de hotlinkear imágenes remotas.
- Si una publicación de Ko-fi no tiene imagen válida, usar fallback o registrar advertencia sin fallar toda la generación.
- No guardar URLs remotas de imágenes de Ko-fi como imagen principal del frontend.
- Mantener separados los datos manuales, los datos obtenidos por fetch y los bundles generados para frontend.

## Seguridad

- No agregar credenciales, tokens, cookies, claves privadas ni datos sensibles al repositorio.
- No modificar configuraciones de secretos sin pedido explícito.
- Revisar diffs antes de commits para detectar datos sensibles.
- No introducir dependencias nuevas sin justificar su necesidad.

## Flujo de trabajo con Git

- No hacer commit ni push salvo pedido explícito del owner.
- Antes de commitear, revisar `git status` y el diff completo.
- Agregar únicamente archivos relacionados con el cambio solicitado.
- Preservar cambios existentes no relacionados aunque estén en el working tree.
- No revertir cambios ajenos sin autorización explícita.
- Preferir un solo commit coherente por mejora cuando el owner lo pida.
- Después de push, verificar workflows relevantes si el cambio afecta automatización, datos generados o publicación.

## Verificación

Ejecutar verificaciones proporcionales al cambio.

Comandos útiles existentes:

- `npm run test:kofi`
- `npm run test:postgres`
- `npm run test:finance`
- `npm run blog:build`
- `npm run kofi:build`
- `npm run feeds:build`
- `npm run refresh:github`
- `npm run stats:build`
- `npm run refresh:data`
- `npm run preview`

Usar `node --check` para archivos JavaScript modificados cuando corresponda.

Cuando un cambio afecte filtros o tarjetas, verificar al menos:

- La vista afectada.
- Una vista que deba permanecer intacta.
- El límite y el orden de las tarjetas.
- El comportamiento con datos de fallback cuando corresponda.

Si una verificación no puede ejecutarse por red, entorno o permisos, reportarlo claramente junto con el riesgo restante.

## Cambios pequeños vs cambios amplios

Para cambios pequeños, claros y acotados:

- Implementar solamente el alcance pedido.
- No rediseñar.
- No agregar funcionalidades extra.
- Verificar lo necesario.

Para cambios amplios, ambiguos, estratégicos o arquitectónicos:

- Inspeccionar el repositorio.
- Proponer un plan.
- Esperar aprobación antes de modificar archivos.
- Explicar tradeoffs, mantenimiento y alternativas.

Para diagnósticos o cambios claramente acotados dentro de una solicitud aprobada, avanzar sin requerir una aprobación adicional.

## Estilo de implementación

- Seguir patrones existentes del repositorio.
- No inventar arquitectura, comandos ni convenciones.
- Preferir cambios simples sobre abstracciones innecesarias.
- Mantener compatibilidad con Bootstrap, scripts existentes y estructura estática actual.
- No introducir frameworks nuevos.
- Cuidar responsive y accesibilidad básica.
- Evitar cambios puramente decorativos si no mejoran conversión, claridad o mantenibilidad.

## Documentación

Actualizar documentación solo cuando el cambio altere comandos, automatización, estructura de datos o flujo de trabajo.

No documentar detalles obvios ni crear documentación extensa que aumente mantenimiento sin necesidad.
