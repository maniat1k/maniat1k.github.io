Perfecto. Te dejo una versión más sobria, profesional y lista para copiar/pegar directamente en tu README.

---

# MANIAT1K — Portal Personal

Portal estático profesional diseñado para centralizar actividad pública, proyectos y presencia digital en un único entorno coherente y automatizado.

El sitio está optimizado para GitHub Pages y no depende de APIs en tiempo de ejecución.

---

## Objetivo

* Unificar actividad reciente de distintas plataformas.
* Mantener un sistema visual consistente basado en tarjetas.
* Automatizar la generación de contenido sin romper el diseño existente.
* Garantizar funcionamiento idéntico en producción y entorno local.

---

## Arquitectura

El sitio funciona bajo un esquema de generación previa de datos:

1. Un proceso automatizado obtiene publicaciones recientes.
2. Se normalizan los datos en archivos JSON estáticos.
3. Se generan imágenes representativas para cada tarjeta.
4. GitHub Pages sirve únicamente contenido estático.
5. El frontend solo realiza `fetch` local a `/data/*.json`.

Esto elimina dependencias externas en runtime y evita problemas de CORS o autenticación.

---

## Estructura principal

```
/
├── index.html
├── css/
├── js/
├── data/
├── assets/
│   ├── cards/
│   └── fallback/
├── scripts/
└── .github/workflows/
```

---

## Modelo de datos

Cada tarjeta se construye a partir de una estructura normalizada:

```json
{
  "id": "unique-id",
  "source": "youtube|instagram|reddit|x|github",
  "title": "Título",
  "url": "https://...",
  "date": "ISO-8601",
  "image": "/assets/cards/imagen.webp",
  "image_alt": "Descripción breve"
}
```

---

## Sistema de imágenes

Para cada tarjeta:

1. Se utiliza thumbnail oficial si está disponible.
2. Si no existe, se intenta obtener `og:image`.
3. Si no hay imagen válida, se genera captura automática.
4. Como último recurso, se aplica fallback por fuente.

Reglas:

* No se repiten imágenes dentro del mismo render.
* Las imágenes respetan el ratio del contenedor.
* No se altera el sistema de animaciones existente.

---

## Generación de feeds

Construcción manual local:

```
npm install
npm run feeds:build
```

Servidor local:

```
npx serve .
```

---

## Automatización

Un workflow de GitHub Actions:

* Genera feeds periódicamente.
* Actualiza `/data` y `/assets`.
* Realiza commit automático.
* Mantiene el portal actualizado sin intervención manual.

---

## Principio operativo

Producción estable = datos generados previamente + frontend simple.

Sin llamadas externas en el navegador.
Sin dependencias frágiles.
Sin impacto en la experiencia visual.

---

Si querés, ahora podemos ajustar el tono aún más hacia:

* Perfil corporativo institucional
* Marca personal técnica
* Estudio creativo minimalista
