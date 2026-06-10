# 🎯 Diagnóstico Financiero Personal - Regla 50/30/20

## ¿Qué es?

Una calculadora de diagnóstico financiero diseñada para ayudarte a entender tu situación económica basada en la **regla 50/30/20**:

- **50%** de tus ingresos → Necesidades (gastos fijos, deudas)
- **30%** de tus ingresos → Deseos (gastos variables, entretenimiento)
- **20%** de tus ingresos → Ahorro

## 🚀 ¿Cómo Usar?

### Paso 1: Ingresa tus datos
1. **Ingreso mensual** (obligatorio)
2. Detalla tus **gastos fijos**: alquiler, servicios, alimentación, transporte, seguros
3. Detalla tus **gastos variables**: ocio, comidas fuera, compras, suscripciones
4. Especifica tus **deudas**: tarjetas de crédito, préstamos
5. (Opcional) Establece una **meta de ahorro**

### Paso 2: Calcula
Haz clic en **"Calcular Diagnóstico"** para obtener tu análisis.

### Paso 3: Interpreta los resultados

Te mostrará:

📊 **Resumen Financiero**
- Tu ingreso total
- Lo que gastas (comprometido)
- Lo que te queda disponible
- Tu capacidad real de ahorro

📈 **Distribución 50/30/20**
- Comparativa entre lo que gastas y lo que deberías gastar
- Barras de progreso visuales
- Diferencias en porcentajes

🎯 **Tu Estado Financiero**
- 🟢 **Saludable**: Ahorras el 20% o más
- 🟡 **Ajustado**: Ahorras menos del 20%
- 🔴 **En Riesgo**: Gastas más de lo que ganas

💡 **Recomendaciones Personalizadas**
- Análisis contextualizado de tu situación
- Sugerencias para mejorar

💰 **Proyecciones de Ahorro**
- Cuánto acumularás en 3, 6 y 12 meses
- Si tienes meta: cuándo la alcanzarás

## 💡 Características

✅ **Sin Backend** - Todo funciona en tu navegador  
✅ **Privado** - Tus datos no se envían a ningún servidor  
✅ **Responsivo** - Funciona en desktop, tablet y mobile  
✅ **Flexible** - Acepta números con . o , como separadores  
✅ **Accesible** - Diseño claro y fácil de usar  
✅ **Rápido** - Cálculos instantáneos  

## 📝 Validaciones

- El ingreso mensual es **obligatorio**
- No se permiten **valores negativos**
- Los **campos vacíos** se consideran **0**
- Acepta formato de moneda: 1000, 1,000, 1.000, 1.000,00

## 🎨 Diseño

- **Amarillo (#FFD100)** como color principal
- **Negro (#00032E)** para títulos y elementos destacados
- **Fondo claro (#FDFDFB)** para comodidad visual
- Tarjetas visuales con sombras suaves
- Tipografía clara: Work Sans

## ⚙️ Tecnología

- **HTML5** semántico
- **CSS3** con variables CSS para fácil personalización
- **JavaScript Vanilla** puro (sin frameworks externos)
- **Bootstrap 5** para estructura base

## 🔧 Desarrollo

Si necesitas realizar cambios o mejoras:

### Archivo principal de lógica
`js/financial-calculator.js` - Contiene toda la lógica de cálculos y validaciones

### Archivos de estilo
- `css/ahorro.css` - Estilos específicos
- `css/style.css` - Estilos compartidos del sitio

### Archivo HTML
`ahorro.html` - Estructura del formulario y resultados

### Funciones disponibles en consola
Abre la consola del navegador (F12) y accede a:
```javascript
window.FinancialCalculator.calculateFinancialDiagnosis(data)
window.FinancialCalculator.formatCurrency(value)
window.FinancialCalculator.parseNumber(string)
```

## 📱 Responsive

- **Desktop**: Dos columnas (entrada / resultados)
- **Tablet**: Una columna con tarjetas apiladas
- **Mobile**: Una columna optimizada para pantalla pequeña

## ♿ Accesibilidad

- ✅ Etiquetas semánticas
- ✅ Labels asociados a inputs
- ✅ Aria-labels en elementos interactivos
- ✅ Suficiente contraste de colores
- ✅ Navegación por teclado

## 🚦 Estados Visuales

### Saludable 🟢
- Disponible mensual positivo
- Capacidad de ahorro ≥ 20%
- Mensaje: "Tu situación financiera es estable."

### Ajustado 🟡
- Disponible mensual positivo
- Capacidad de ahorro < 20%
- Mensaje: "Tu capacidad de ahorro es menor al 20%..."

### En Riesgo 🔴
- Disponible mensual ≤ 0
- Mensaje: "Tu disponible es negativo o cero..."

## 💬 Mensajes Inteligentes

La herramienta genera automáticamente mensajes según tu situación:

- Si gastas más del 50% en necesidades: alerta sobre deudas
- Si estás en equilibrio: refuerzo positivo
- Si tienes gastos variables altos: sugerencias de reducción
- Si tienes deudas: análisis de impacto
- Si no alcanzas el 20%: cálculo de cuánto podrías ahorrar

## 🎯 Metas de Ahorro

Si estableces una meta:
- Se calcula automáticamente cuántos meses necesitas
- Se genera una fecha estimada de cumplimiento
- Ejemplo: "Meta de $10,000 → Alcanzable en 8 meses → Fecha: Febrero 2027"

## 📊 Proyecciones

Basadas en tu ahorro real actual:
- **3 meses**: Acumulación a corto plazo
- **6 meses**: Visualizar progreso a mediano plazo
- **12 meses**: Proyección anual para planificación

## 🎓 Educación Financiera

La herramienta incluye:
- ✅ Explicación de la regla 50/30/20
- ✅ Mensajes educativos en contexto
- ✅ Análisis sobre deudas y oportunidades
- ✅ Recomendaciones prácticas

## 🔮 Posibles Mejoras Futuras

- Gráficos interactivos
- Histórico de cambios
- Exportar a PDF
- Integración con bancos
- Análisis de tendencias
- Presupuesto comparativo

---

**Recuerda:** La regla 50/30/20 es una guía orientativa, no una obligación. Adapta los porcentajes a tu situación personal y objetivos financieros.
