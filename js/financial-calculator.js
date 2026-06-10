/**
 * FINANCIAL CALCULATOR - Diagnóstico Financiero 50/30/20
 * =========================================================
 * Este módulo contiene toda la lógica para calcular y visualizar
 * el diagnóstico financiero basado en la regla 50/30/20.
 * 
 * Funcionalidades:
 * - Validación de entrada de datos
 * - Parseo de números con punto o coma
 * - Cálculos de distribución 50/30/20
 * - Generación de recomendaciones inteligentes
 * - Proyección de ahorro a corto/mediano/largo plazo
 * - Estados visuales (Saludable, Ajustado, En Riesgo)
 */

// =========================================================
// CONFIGURACIÓN Y CONSTANTES
// =========================================================

const CONFIG = {
  NEEDS_PERCENTAGE: 0.50,      // 50% para necesidades
  WANTS_PERCENTAGE: 0.30,      // 30% para deseos
  SAVINGS_PERCENTAGE: 0.20,    // 20% para ahorro
  CURRENCY_SYMBOL: '$',
  CURRENCY_DECIMALS: 2,
};

// =========================================================
// SELECTORES DEL DOM
// =========================================================

const selectors = {
  form: '#financialForm',
  inputSection: '#inputSection',
  resultsSection: '#resultsSection',
  recommendationsAlert: '#recommendationsAlert',
  
  // Inputs
  monthlyIncome: '#monthlyIncome',
  rent: '#rent',
  utilities: '#utilities',
  food: '#food',
  transport: '#transport',
  insurance: '#insurance',
  otherFixed: '#otherFixed',
  entertainment: '#entertainment',
  dining: '#dining',
  shopping: '#shopping',
  subscriptions: '#subscriptions',
  otherVariable: '#otherVariable',
  creditCards: '#creditCards',
  loans: '#loans',
  savingsGoal: '#savingsGoal',
  
  // Summary outputs
  summaryIncome: '#summaryIncome',
  summaryCommitted: '#summaryCommitted',
  summaryAvailable: '#summaryAvailable',
  summarySavingCapacity: '#summarySavingCapacity',
  
  // Status indicator
  statusCard: '#statusCard',
  statusEmoji: '#statusEmoji',
  statusLabel: '#statusLabel',
  statusDescription: '#statusDescription',
  
  // Distribution
  needsPercentage: '#needsPercentage',
  needsBar: '#needsBar',
  needsRecommended: '#needsRecommended',
  needsActual: '#needsActual',
  wantsPercentage: '#wantsPercentage',
  wantsBar: '#wantsBar',
  wantsRecommended: '#wantsRecommended',
  wantsActual: '#wantsActual',
  savingsPercentage: '#savingsPercentage',
  savingsBar: '#savingsBar',
  savingsRecommended: '#savingsRecommended',
  savingsActual: '#savingsActual',
  
  // Breakdown
  breakdownFixed: '#breakdownFixed',
  breakdownVariable: '#breakdownVariable',
  breakdownDebt: '#breakdownDebt',
  
  // Projections
  projectionContainer: '#projectionContainer',
  savingsGoalSection: '#savingsGoalSection',
  monthsToGoal: '#monthsToGoal',
  goalDate: '#goalDate',
  
  // Insights
  insightsContainer: '#insightsContainer',
};

// =========================================================
// UTILIDADES DE FORMATEO
// =========================================================

/**
 * Convierte un número a formato de moneda
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado
 */
function formatCurrency(value) {
  return `${CONFIG.CURRENCY_SYMBOL}${parseFloat(value).toFixed(CONFIG.CURRENCY_DECIMALS)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Parsea un valor de entrada que puede tener punto o coma
 * Acepta: "1000", "1,000", "1.000", "1.000,00"
 * @param {string} value - Valor a parsear
 * @returns {number} Número parseado
 */
function parseNumber(value) {
  if (!value || typeof value !== 'string') return 0;
  
  // Remover espacios
  let clean = value.trim();
  if (!clean) return 0;
  
  // Si tiene ambos punto y coma, el último separador es el decimal
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');
  
  // Si tiene ambos, determinar cuál es el decimal
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) {
      // Formato: 1.000,00 o 1,000.00
      clean = clean.replace(/,/g, '').replace('.', ',');
    } else {
      // Formato: 1,000.00
      clean = clean.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Si solo tiene coma, verificar si es separador de miles o decimal
    const parts = clean.split(',');
    if (parts[1].length === 2) {
      // Es decimal: "1000,00"
      clean = clean.replace(',', '.');
    } else {
      // Es miles: "1,000"
      clean = clean.replace(',', '');
    }
  }
  
  return parseFloat(clean) || 0;
}

/**
 * Calcula el porcentaje
 * @param {number} value - Valor
 * @param {number} total - Total
 * @returns {number} Porcentaje
 */
function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Redondea un número a 2 decimales
 * @param {number} value - Valor a redondear
 * @returns {number} Valor redondeado
 */
function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

// =========================================================
// LECTURA DE DATOS DEL FORMULARIO
// =========================================================

/**
 * Lee todos los valores del formulario
 * @returns {Object} Objeto con todos los valores
 */
function readFormData() {
  const data = {
    monthlyIncome: parseNumber(document.querySelector(selectors.monthlyIncome).value),
    fixedExpenses: {
      rent: parseNumber(document.querySelector(selectors.rent).value),
      utilities: parseNumber(document.querySelector(selectors.utilities).value),
      food: parseNumber(document.querySelector(selectors.food).value),
      transport: parseNumber(document.querySelector(selectors.transport).value),
      insurance: parseNumber(document.querySelector(selectors.insurance).value),
      otherFixed: parseNumber(document.querySelector(selectors.otherFixed).value),
    },
    variableExpenses: {
      entertainment: parseNumber(document.querySelector(selectors.entertainment).value),
      dining: parseNumber(document.querySelector(selectors.dining).value),
      shopping: parseNumber(document.querySelector(selectors.shopping).value),
      subscriptions: parseNumber(document.querySelector(selectors.subscriptions).value),
      otherVariable: parseNumber(document.querySelector(selectors.otherVariable).value),
    },
    debt: {
      creditCards: parseNumber(document.querySelector(selectors.creditCards).value),
      loans: parseNumber(document.querySelector(selectors.loans).value),
    },
    savingsGoal: parseNumber(document.querySelector(selectors.savingsGoal).value),
  };
  
  return data;
}

/**
 * Suma todos los gastos fijos
 * @param {Object} fixedExpenses - Objeto con gastos fijos
 * @returns {number} Total de gastos fijos
 */
function getTotalFixedExpenses(fixedExpenses) {
  return Object.values(fixedExpenses).reduce((sum, val) => sum + val, 0);
}

/**
 * Suma todos los gastos variables
 * @param {Object} variableExpenses - Objeto con gastos variables
 * @returns {number} Total de gastos variables
 */
function getTotalVariableExpenses(variableExpenses) {
  return Object.values(variableExpenses).reduce((sum, val) => sum + val, 0);
}

/**
 * Suma todas las deudas
 * @param {Object} debt - Objeto con deudas
 * @returns {number} Total de deudas
 */
function getTotalDebt(debt) {
  return Object.values(debt).reduce((sum, val) => sum + val, 0);
}

// =========================================================
// CÁLCULOS PRINCIPALES
// =========================================================

/**
 * Realiza todos los cálculos del diagnóstico financiero
 * @param {Object} data - Datos del formulario
 * @returns {Object} Objeto con todos los cálculos
 */
function calculateFinancialDiagnosis(data) {
  // Validación: ingreso mensual obligatorio
  if (data.monthlyIncome <= 0) {
    throw new Error('El ingreso mensual debe ser mayor a 0');
  }
  
  const totalFixed = getTotalFixedExpenses(data.fixedExpenses);
  const totalVariable = getTotalVariableExpenses(data.variableExpenses);
  const totalDebt = getTotalDebt(data.debt);
  const totalCommitted = totalFixed + totalVariable + totalDebt;
  const availableMonthly = data.monthlyIncome - totalCommitted;
  
  // Cálculos de la regla 50/30/20
  const recommended = {
    needs: data.monthlyIncome * CONFIG.NEEDS_PERCENTAGE,
    wants: data.monthlyIncome * CONFIG.WANTS_PERCENTAGE,
    savings: data.monthlyIncome * CONFIG.SAVINGS_PERCENTAGE,
  };
  
  // Gasto actual en necesidades = gastos fijos + parte de deudas (consideramos como necesarias)
  const actualNeeds = totalFixed + totalDebt;
  
  // Gasto actual en deseos = gastos variables
  const actualWants = totalVariable;
  
  // Capacidad real de ahorro
  const actualSavings = Math.max(0, availableMonthly);
  
  // Cálculo de porcentajes reales
  const actualPercentages = {
    needs: calculatePercentage(actualNeeds, data.monthlyIncome),
    wants: calculatePercentage(actualWants, data.monthlyIncome),
    savings: calculatePercentage(actualSavings, data.monthlyIncome),
  };
  
  return {
    monthlyIncome: roundToTwo(data.monthlyIncome),
    totalFixed: roundToTwo(totalFixed),
    totalVariable: roundToTwo(totalVariable),
    totalDebt: roundToTwo(totalDebt),
    totalCommitted: roundToTwo(totalCommitted),
    availableMonthly: roundToTwo(availableMonthly),
    actualSavings: roundToTwo(actualSavings),
    recommended,
    actual: {
      needs: roundToTwo(actualNeeds),
      wants: roundToTwo(actualWants),
      savings: roundToTwo(actualSavings),
    },
    percentages: {
      actual: actualPercentages,
      recommended: {
        needs: CONFIG.NEEDS_PERCENTAGE * 100,
        wants: CONFIG.WANTS_PERCENTAGE * 100,
        savings: CONFIG.SAVINGS_PERCENTAGE * 100,
      },
    },
    status: getFinancialStatus(actualPercentages.savings, availableMonthly),
    savingsGoal: data.savingsGoal,
  };
}

/**
 * Determina el estado financiero del usuario
 * @param {number} savingsPercentage - Porcentaje de ahorro real
 * @param {number} available - Disponible mensual
 * @returns {Object} Objeto con estatus y descripción
 */
function getFinancialStatus(savingsPercentage, available) {
  if (available <= 0) {
    return {
      status: 'at-risk',
      emoji: '🔴',
      label: 'En Riesgo',
      color: 'danger',
      description: 'Tu disponible es negativo o cero. Necesitas revisar tus gastos urgentemente.',
    };
  } else if (savingsPercentage >= 20) {
    return {
      status: 'healthy',
      emoji: '🟢',
      label: 'Saludable',
      color: 'success',
      description: 'Tu capacidad de ahorro es cercana o superior al 20%. ¡Excelente!',
    };
  } else {
    return {
      status: 'adjusted',
      emoji: '🟡',
      label: 'Ajustado',
      color: 'warning',
      description: 'Tu capacidad de ahorro es menor al 20%. Hay margen para mejorar.',
    };
  }
}

/**
 * Genera recomendaciones inteligentes basadas en la situación financiera
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 * @returns {Array} Array de recomendaciones
 */
function generateRecommendations(diagnosis) {
  const recommendations = [];
  const needsPercentage = diagnosis.percentages.actual.needs;
  
  // Recomendacion 1: Sobre gastos fijos y deudas
  if (needsPercentage > 50) {
    recommendations.push({
      type: 'warning',
      title: 'Necesidades Elevadas',
      message: `Las necesidades (incluyendo deudas) consumen el ${needsPercentage.toFixed(1)}% de tus ingresos, superando el 50% recomendado. Antes de enfocarte en aumentar el ahorro, considera revisar gastos fijos como alquiler o servicios, y evaluar la posibilidad de reducir deudas o tarjetas de credito.`,
    });
  } else if (needsPercentage <= 50 && diagnosis.percentages.actual.savings >= 20) {
    recommendations.push({
      type: 'success',
      title: '✅ Distribucion Saludable',
      message: 'Tu distribucion esta alineada con la regla 50/30/20. Estas en el camino correcto. Manten esta disciplina y podras lograr tus metas de ahorro.',
    });
  }
  
  // Recomendacion 2: Sobre disponible mensual
  if (diagnosis.availableMonthly <= 0) {
    recommendations.push({
      type: 'danger',
      title: 'Situacion Critica',
      message: 'Tu disponible mensual es negativo. Gastas mas de lo que ganas. Esto es insostenible a largo plazo. Necesitas reducciones urgentes en tus gastos, especialmente en deudas y gastos variables.',
    });
  } else if (diagnosis.availableMonthly > 0 && diagnosis.availableMonthly < diagnosis.recommended.savings) {
    recommendations.push({
      type: 'info',
      title: 'Aumenta tu Capacidad de Ahorro',
      message: `Actualmente tienes ${formatCurrency(diagnosis.availableMonthly)} disponibles. Para alcanzar la meta del 20% en ahorro necesitarias ${formatCurrency(diagnosis.recommended.savings)}. Revisa tus gastos variables para encontrar oportunidades de optimizacion.`,
    });
  }
  
  // Recomendacion 3: Sobre deudas
  if (diagnosis.totalDebt > 0) {
    const debtPercentage = (diagnosis.totalDebt / diagnosis.monthlyIncome) * 100;
    recommendations.push({
      type: 'warning',
      title: 'Gestion de Deudas',
      message: `Tus deudas representan el ${debtPercentage.toFixed(1)}% de tus ingresos. Considera crear un plan para reducir estas obligaciones, ya que liberarian flujo de caja para ahorrar.`,
    });
  }
  
  // Recomendacion 4: Sobre gastos variables
  if (diagnosis.percentages.actual.wants > 30) {
    recommendations.push({
      type: 'warning',
      title: 'Gastos Variables Elevados',
      message: `Tus gastos variables (deseos) representan el ${diagnosis.percentages.actual.wants.toFixed(1)}% de tus ingresos, superando el 30% sugerido. Estos son mas flexibles y podrias reducirlos para aumentar tu ahorro.`,
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'Todo va bien',
      message: 'Tu situacion financiera esta equilibrada. Manten tu disciplina y continua ahorrando.',
    });
  }
  
  return recommendations;
}

/**
 * Calcula las proyecciones de ahorro
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 * @returns {Object} Proyecciones a 3, 6 y 12 meses
 */
function calculateSavingsProjections(diagnosis) {
  const monthlyRate = diagnosis.actualSavings;
  
  return {
    threeMonths: roundToTwo(monthlyRate * 3),
    sixMonths: roundToTwo(monthlyRate * 6),
    twelveMonths: roundToTwo(monthlyRate * 12),
  };
}

/**
 * Calcula cuánto tiempo falta para alcanzar la meta de ahorro
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 * @returns {Object|null} Información sobre la meta o null si no hay meta
 */
function calculateGoalTimeline(diagnosis) {
  if (!diagnosis.savingsGoal || diagnosis.savingsGoal === 0 || diagnosis.actualSavings === 0) {
    return null;
  }
  
  const monthsNeeded = Math.ceil(diagnosis.savingsGoal / diagnosis.actualSavings);
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + monthsNeeded, today.getDate());
  
  return {
    goal: diagnosis.savingsGoal,
    monthsNeeded: monthsNeeded,
    estimatedDate: targetDate,
    formattedDate: targetDate.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
  };
}

// =========================================================
// RENDERIZADO DE RESULTADOS
// =========================================================

/**
 * Actualiza la UI con los resultados del diagnóstico
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 */
function displayResults(diagnosis) {
  // Mostrar sección de resultados
  document.querySelector(selectors.resultsSection).style.display = 'block';
  
  // Scroll suave a los resultados
  setTimeout(() => {
    document.querySelector(selectors.resultsSection).scrollIntoView({ behavior: 'smooth' });
  }, 100);
  
  // Recomendaciones alertas
  displayRecommendations(diagnosis);
  
  // Resumen financiero
  document.querySelector(selectors.summaryIncome).textContent = formatCurrency(diagnosis.monthlyIncome);
  document.querySelector(selectors.summaryCommitted).textContent = formatCurrency(diagnosis.totalCommitted);
  document.querySelector(selectors.summaryAvailable).textContent = formatCurrency(diagnosis.availableMonthly);
  document.querySelector(selectors.summarySavingCapacity).textContent = formatCurrency(diagnosis.actualSavings);
  
  // Estado financiero
  const status = diagnosis.status;
  document.querySelector(selectors.statusEmoji).textContent = status.emoji;
  document.querySelector(selectors.statusLabel).textContent = status.label;
  document.querySelector(selectors.statusDescription).textContent = status.description;
  
  // Actualizar color del card de estado
  const statusCard = document.querySelector(selectors.statusCard);
  statusCard.className = `card border-0 shadow-sm status-${status.status}`;
  
  // Distribución 50/30/20
  displayDistribution(diagnosis);
  
  // Desglose de gastos
  document.querySelector(selectors.breakdownFixed).textContent = formatCurrency(diagnosis.totalFixed);
  document.querySelector(selectors.breakdownVariable).textContent = formatCurrency(diagnosis.totalVariable);
  document.querySelector(selectors.breakdownDebt).textContent = formatCurrency(diagnosis.totalDebt);
  
  // Proyecciones de ahorro
  displayProjections(diagnosis);
  
  // Insights
  displayInsights(diagnosis);
}

/**
 * Muestra las recomendaciones como alertas
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 */
function displayRecommendations(diagnosis) {
  const recommendations = generateRecommendations(diagnosis);
  const container = document.querySelector(selectors.recommendationsAlert);
  
  let html = '';
  recommendations.forEach(rec => {
    const alertClass = getAlertClass(rec.type);
    html += `
      <div class="alert ${alertClass} border-0 shadow-sm" role="alert">
        <h4 class="alert-heading">${rec.title}</h4>
        <p class="mb-0">${rec.message}</p>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Retorna la clase CSS para el tipo de alerta
 * @param {string} type - Tipo de alerta (warning, success, danger, info)
 * @returns {string} Clase CSS
 */
function getAlertClass(type) {
  const map = {
    'warning': 'alert-warning',
    'success': 'alert-success',
    'danger': 'alert-danger',
    'info': 'alert-info',
  };
  return map[type] || 'alert-info';
}

/**
 * Renderiza la distribución 50/30/20
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 */
function displayDistribution(diagnosis) {
  const { actual, recommended } = diagnosis.percentages;
  
  // Necesidades (50%)
  document.querySelector(selectors.needsPercentage).textContent = 
    `${actual.needs.toFixed(1)}% / ${recommended.needs.toFixed(0)}%`;
  document.querySelector(selectors.needsBar).style.width = `${Math.min(actual.needs, 100)}%`;
  document.querySelector(selectors.needsRecommended).textContent = formatCurrency(diagnosis.recommended.needs);
  document.querySelector(selectors.needsActual).textContent = formatCurrency(diagnosis.actual.needs);
  
  // Deseos (30%)
  document.querySelector(selectors.wantsPercentage).textContent = 
    `${actual.wants.toFixed(1)}% / ${recommended.wants.toFixed(0)}%`;
  document.querySelector(selectors.wantsBar).style.width = `${Math.min(actual.wants, 100)}%`;
  document.querySelector(selectors.wantsRecommended).textContent = formatCurrency(diagnosis.recommended.wants);
  document.querySelector(selectors.wantsActual).textContent = formatCurrency(diagnosis.actual.wants);
  
  // Ahorro (20%)
  document.querySelector(selectors.savingsPercentage).textContent = 
    `${actual.savings.toFixed(1)}% / ${recommended.savings.toFixed(0)}%`;
  document.querySelector(selectors.savingsBar).style.width = `${Math.min(actual.savings, 100)}%`;
  document.querySelector(selectors.savingsRecommended).textContent = formatCurrency(diagnosis.recommended.savings);
  document.querySelector(selectors.savingsActual).textContent = formatCurrency(diagnosis.actual.savings);
}

/**
 * Renderiza las proyecciones de ahorro
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 */
function displayProjections(diagnosis) {
  const projections = calculateSavingsProjections(diagnosis);
  const container = document.querySelector(selectors.projectionContainer);
  
  let html = `
    <div class="col-md-4">
      <div class="text-center">
        <p class="text-muted small mb-2">Ahorro en 3 meses</p>
        <p class="h3 fw-bold text-success">${formatCurrency(projections.threeMonths)}</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="text-center">
        <p class="text-muted small mb-2">Ahorro en 6 meses</p>
        <p class="h3 fw-bold text-success">${formatCurrency(projections.sixMonths)}</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="text-center">
        <p class="text-muted small mb-2">Ahorro en 12 meses</p>
        <p class="h3 fw-bold text-success">${formatCurrency(projections.twelveMonths)}</p>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Meta de ahorro
  const goalTimeline = calculateGoalTimeline(diagnosis);
  const goalSection = document.querySelector(selectors.savingsGoalSection);
  
  if (goalTimeline) {
    goalSection.style.display = 'block';
    document.querySelector(selectors.monthsToGoal).textContent = 
      `${goalTimeline.monthsNeeded} meses (~${Math.round(goalTimeline.monthsNeeded / 12)} años)`;
    document.querySelector(selectors.goalDate).textContent = goalTimeline.formattedDate;
  } else {
    goalSection.style.display = 'none';
  }
}

/**
 * Renderiza los insights y análisis adicionales
 * @param {Object} diagnosis - Objeto con los cálculos del diagnóstico
 */
function displayInsights(diagnosis) {
  const container = document.querySelector(selectors.insightsContainer);
  const { actual, recommended } = diagnosis.percentages;
  
  let insights = [];
  
  // Análisis 1: Situación general
  if (diagnosis.availableMonthly > 0) {
    insights.push(`
      <div class="mb-4">
        <h4 class="h6 fw-bold">📊 Tu Situación General</h4>
        <p>Tienes un disponible mensual de ${formatCurrency(diagnosis.availableMonthly)}, 
           lo que significa que gastas el ${((diagnosis.totalCommitted / diagnosis.monthlyIncome) * 100).toFixed(1)}% 
           de tus ingresos.</p>
      </div>
    `);
  }
  
  // Análisis 2: Comparación con la regla
  if (actual.needs > recommended.needs) {
    insights.push(`
      <div class="mb-4">
        <h4 class="h6 fw-bold">🎯 Oportunidad en Necesidades</h4>
        <p>Tus gastos en necesidades superan el 50% recomendado en ${(actual.needs - recommended.needs).toFixed(1)} 
           puntos porcentuales. Optimizar estos gastos es prioritario.</p>
      </div>
    `);
  }
  
  if (actual.wants > recommended.wants) {
    insights.push(`
      <div class="mb-4">
        <h4 class="h6 fw-bold">🛍️ Gestión de Deseos</h4>
        <p>Tus gastos variables superan el 30% recomendado. Podrías reducirlos en 
           ${formatCurrency((actual.wants / 100 * diagnosis.monthlyIncome) - diagnosis.recommended.wants)} 
           para mejorar tu ahorro.</p>
      </div>
    `);
  }
  
  // Análisis 3: Potencial de ahorro
  const potentialSavings = diagnosis.recommended.savings - diagnosis.actual.savings;
  if (potentialSavings > 0) {
    insights.push(`
      <div class="mb-4">
        <h4 class="h6 fw-bold">💰 Tu Potencial de Ahorro</h4>
        <p>Si logras alcanzar el 20% de ahorro recomendado, podrías ahorrar 
           ${formatCurrency(potentialSavings)} adicionales al mes. 
           En un año, esto equivaldría a ${formatCurrency(potentialSavings * 12)}.</p>
      </div>
    `);
  }
  
  // Análisis 4: Sostenibilidad
  if (diagnosis.availableMonthly >= diagnosis.actual.savings) {
    insights.push(`
      <div class="mb-4">
        <h4 class="h6 fw-bold">✅ Sostenibilidad</h4>
        <p>Tu plan financiero es sostenible con los gastos actuales. Mantén esta disciplina 
           para alcanzar tus metas de ahorro.</p>
      </div>
    `);
  }
  
  container.innerHTML = insights.join('') || '<p class="text-muted">No hay análisis adicionales disponibles.</p>';
}

// =========================================================
// VALIDACIÓN Y MANEJO DE EVENTOS
// =========================================================

/**
 * Valida que el ingreso sea mayor a 0
 * @returns {boolean} True si es válido
 */
function validateForm() {
  const income = parseNumber(document.querySelector(selectors.monthlyIncome).value);
  if (income <= 0) {
    alert('Por favor, ingresa un ingreso mensual válido mayor a 0.');
    return false;
  }
  return true;
}

/**
 * Maneja el envío del formulario
 */
function handleFormSubmit(e) {
  e.preventDefault();
  
  try {
    if (!validateForm()) return;
    
    const data = readFormData();
    const diagnosis = calculateFinancialDiagnosis(data);
    displayResults(diagnosis);
  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error('Error en el cálculo:', error);
  }
}

// =========================================================
// INICIALIZACIÓN
// =========================================================

document.addEventListener('DOMContentLoaded', function() {
  // Asociar manejador del formulario
  const form = document.querySelector(selectors.form);
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  console.log('✅ Financial Calculator inicializado correctamente');
});

// =========================================================
// EXPORTACIÓN DE FUNCIONES (para debugging)
// =========================================================

// Disponible en la consola del navegador: window.FinancialCalculator
window.FinancialCalculator = {
  formatCurrency,
  parseNumber,
  calculatePercentage,
  roundToTwo,
  readFormData,
  calculateFinancialDiagnosis,
  generateRecommendations,
  calculateSavingsProjections,
  calculateGoalTimeline,
  getFinancialStatus,
};