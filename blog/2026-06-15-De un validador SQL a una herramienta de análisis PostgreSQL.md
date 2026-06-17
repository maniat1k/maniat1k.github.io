---
title: De un validador SQL a una herramienta de análisis PostgreSQL
date: 2026-06-15
summary: Lo que empezó como un pequeño validador de sintaxis terminó convirtiéndose en una nueva herramienta pública dentro de mi portal personal.
tags:
  - postgresql
  - javascript
  - desarrollo-web
  - herramientas
  - proyectos
---

# De un validador SQL a una herramienta de análisis PostgreSQL

Mientras trabajaba en mi portal personal apareció una idea aparentemente sencilla.

Crear un validador de sintaxis SQL.

La intención inicial era bastante simple: permitir que una persona pegara una consulta y recibir una respuesta rápida indicando si existían errores evidentes.

Parecía un proyecto relativamente pequeño, de verdad pensé que era simple, que se resolvería con unas pocas expresiones regulares y algunas validaciones básicas.

No fue así:

---

## El problema real

Muy rápido apareció una conclusión importante.

Había subestimado el problema.

Pensé que estaba intentando validar un texto, cuando en realidad estaba intentando interpretar un lenguaje con su propia estructura y reglas.

Y ahí fue cuando el proyecto empezó a cambiar de dimensión.

Un `SELECT` simple es fácil de interpretar.

```sql
SELECT id, name
FROM users
WHERE active = true;
```

Pero enseguida empiezan a aparecer escenarios más complejos.

```sql
CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

Y ahí el problema cambia completamente.

Ya no alcanza con buscar palabras clave.

Hay que entender relaciones, bloques, restricciones y estructuras válidas.

En otras palabras, un validador sencillo empieza a parecerse a un parser.

---

## El primer enfoque

La primera versión se construyó completamente en JavaScript y ejecutándose dentro del navegador.

La idea era muy clara:

* No ejecutar SQL.
* No conectarse a ninguna base de datos.
* No enviar información a servidores externos.
* Mantener todo local y seguro.

El resultado inicial fue bastante bueno.

El sistema comenzó a detectar:

* Strings sin cerrar.
* Paréntesis incompletos.
* Consultas vacías.
* Algunos errores básicos de `SELECT`, `INSERT` y `CREATE TABLE`.

Pero pronto aparecieron las limitaciones.

---

## Los falsos positivos y los falsos negativos

Ahí empezó la parte realmente interesante.

Algunos casos inválidos eran aceptados.

Por ejemplo:

```sql
INSERT INTO t (name);
```

Y algunos casos válidos eran rechazados.

```sql
CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

También aparecieron consultas extrañas como:

```sql
SELECT 1 SELECT 2;
```

Que un usuario probablemente nunca escribiría a propósito, pero que igualmente servían para poner a prueba la robustez del analizador.

Ese fue el momento donde quedó claro que el proyecto necesitaba otro enfoque.

---

## De una prueba a una herramienta

En lugar de esconder el experimento dentro de la página principal del portal, decidí convertirlo en una herramienta independiente.

Así nació el Analizador PostgreSQL.

La idea es simple.

Pegar código SQL y obtener un análisis estático sin ejecutar absolutamente nada.

La herramienta busca responder preguntas como:

* ¿La estructura general parece válida?
* ¿Qué tipo de sentencia estoy escribiendo?
* ¿Existen errores evidentes?
* ¿Hay advertencias?
* ¿Qué podría mejorar?

Todo directamente desde el navegador.

---

## Lo interesante no es PostgreSQL

La enseñanza va un poco más allá.

Este proyecto está repitiendo un patrón que ya apareció anteriormente con la herramienta financiera.

Muchas veces una idea pequeña termina creciendo cuando empezamos a entender mejor el problema real.

El proyecto ya dejó de ser un validador.

Se está convirtiendo en una herramienta.

Y probablemente siga evolucionando.

---

## Próximos pasos

Las siguientes mejoras ya están identificadas:

## Próximos pasos

- ~~Crear una suite automática de tests.~~
- ~~Mejorar el soporte para `CREATE TABLE`.~~
- ~~Endurecer validaciones de `INSERT`.~~
- ~~Detectar estructuras SQL ambiguas.~~
- ~~Agregar recomendaciones más inteligentes.~~
- ~~Mejorar la clasificación de advertencias.~~
- ~~Permitir copiar resultados de análisis.~~
- ~~Incorporar estadísticas básicas de complejidad.~~

El objetivo es ayudar a pensar mejor las consultas antes de ejecutarlas.

> 🚀 Podés probar la herramienta acá:
>
> [https://maniat1k.github.io/postgres-analyzer.html]( https://maniat1k.github.io/postgres-analyzer.html)
