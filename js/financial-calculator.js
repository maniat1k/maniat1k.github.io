/**
 * Local personal finance analyzer.
 * Works entirely in the browser: no backend, no accounts, no tracking.
 */
(function () {
  'use strict';

  const SCHEMA_VERSION = '2.0.0';
  const CONFIG = {
    CURRENCY_SYMBOL: '$',
    CURRENCY_DECIMALS: 2,
    ESSENTIAL_LIMIT: 0.50,
    SAVINGS_TARGET: 0.20,
    SCENARIOS: {
      conservador: 0.50,
      realista: 0.75,
      agresivo: 1
    }
  };

  const FIELD_IDS = [
    'monthlyIncome', 'extraIncome', 'otherIncome',
    'rent', 'utilities', 'food', 'transport', 'insurance', 'health', 'education', 'family', 'otherFixed',
    'entertainment', 'dining', 'shopping', 'subscriptions', 'otherVariable',
    'totalDebt', 'creditCards', 'loans', 'debtExtraPayment',
    'emergencyFund', 'savingsGoal', 'goalName'
  ];

  const CURRENCY_FIELD_IDS = FIELD_IDS.filter((id) => id !== 'goalName');
  const STEPS = [
    { id: 'monthlyIncome', category: 'Ingresos', title: '¿Cuál es tu sueldo mensual?', help: 'Tu ingreso principal del mes. Podés sumar partidas con +.', kind: 'income' },
    { id: 'extraIncome', category: 'Ingresos', title: '¿Tenés ingresos extra?', help: 'Freelance, bonos, comisiones u otros ingresos variables.', kind: 'income' },
    { id: 'otherIncome', category: 'Ingresos', title: '¿Algún otro ingreso mensual?', help: 'Cualquier entrada adicional que quieras considerar.', kind: 'income' },
    { id: 'rent', category: 'Necesidades', title: '¿Cuánto gastás en alquiler o hipoteca?', help: 'Incluí alquiler, expensas o cuota de vivienda.', kind: 'needs' },
    { id: 'utilities', category: 'Necesidades', title: '¿Cuánto van tus servicios?', help: 'Luz, agua, internet, celular y servicios básicos.', kind: 'needs' },
    { id: 'food', category: 'Necesidades', title: '¿Cuánto destinás a alimentación?', help: 'Supermercado y compras esenciales de comida.', kind: 'needs' },
    { id: 'transport', category: 'Necesidades', title: '¿Cuánto gastás en transporte?', help: 'Boletos, combustible, peajes, taxi o apps.', kind: 'needs' },
    { id: 'insurance', category: 'Necesidades', title: '¿Tenés gastos de seguros?', help: 'Seguro del auto, hogar, vida u otros.', kind: 'needs' },
    { id: 'health', category: 'Necesidades', title: '¿Cuánto gastás en salud?', help: 'Mutualista, medicamentos, consultas o tratamientos.', kind: 'needs' },
    { id: 'education', category: 'Necesidades', title: '¿Cuánto destinás a educación?', help: 'Cursos, cuotas, materiales o formación recurrente.', kind: 'needs' },
    { id: 'family', category: 'Necesidades', title: '¿Tenés gastos familiares?', help: 'Ayudas, cuidados o responsabilidades familiares.', kind: 'needs' },
    { id: 'otherFixed', category: 'Necesidades', title: '¿Otros gastos fijos?', help: 'Cualquier necesidad mensual que no entró antes.', kind: 'needs' },
    { id: 'entertainment', category: 'Deseos', title: '¿Cuánto gastás en ocio?', help: 'Salidas, entretenimiento, hobbies y planes.', kind: 'wants' },
    { id: 'dining', category: 'Deseos', title: '¿Cuánto gastás comiendo afuera?', help: 'Restaurantes, cafés, delivery y antojos.', kind: 'wants' },
    { id: 'shopping', category: 'Deseos', title: '¿Cuánto va a compras o ropa?', help: 'Compras personales que podés ajustar si hace falta.', kind: 'wants' },
    { id: 'subscriptions', category: 'Deseos', title: '¿Cuánto pagás en suscripciones?', help: 'Streaming, apps, membresías y software.', kind: 'wants' },
    { id: 'otherVariable', category: 'Deseos', title: '¿Otros gastos variables?', help: 'Gastos personales que cambian mes a mes.', kind: 'wants' },
    { id: 'totalDebt', category: 'Deudas', title: '¿Cuál es tu deuda total?', help: 'Saldo pendiente aproximado, si aplica.', kind: 'debt' },
    { id: 'creditCards', category: 'Deudas', title: '¿Cuánto pagás de mínimo mensual?', help: 'Pago mínimo de tarjetas u obligaciones similares.', kind: 'debt' },
    { id: 'loans', category: 'Deudas', title: '¿Cuánto pagás en préstamos o cuotas?', help: 'Cuotas mensuales de préstamos activos.', kind: 'debt' },
    { id: 'debtExtraPayment', category: 'Deudas', title: '¿Harías un pago extra mensual?', help: 'Monto adicional para acelerar salida de deuda.', kind: 'debt' },
    { id: 'emergencyFund', category: 'Fondo', title: '¿Cuánto tenés en fondo de emergencia?', help: 'Dinero disponible para imprevistos.', kind: 'fund' },
    { id: 'savingsGoal', category: 'Objetivo', title: '¿Tenés una meta de ahorro?', help: 'Monto objetivo opcional. Podés dejarlo en 0.', kind: 'goal' }
  ];
  const PLAN_STEPS = [
    { title: 'Ingresos mensuales', short: 'Ingresos', description: '¿Cuánto dinero entra?', help: 'Contanos cuánto dinero entra en un mes habitual.', fields: ['monthlyIncome', 'extraIncome', 'otherIncome'] },
    { title: 'Obligaciones fijas', short: 'Fijos', description: 'Vivienda, servicios, etc.', help: 'Sumá los compromisos básicos y recurrentes del mes.', fields: ['rent', 'utilities', 'food', 'transport', 'insurance', 'health', 'education', 'family', 'otherFixed'] },
    { title: 'Gastos variables', short: 'Variables', description: 'Salidas, compras y gustos', help: 'Registrá gastos flexibles para entender cuánto destinás a disfrutar.', fields: ['entertainment', 'dining', 'shopping', 'subscriptions', 'otherVariable'] },
    { title: 'Deudas', short: 'Deudas', description: 'Tarjetas, préstamos, etc.', help: 'Anotá saldos y pagos mensuales para priorizar una salida sostenible.', fields: ['totalDebt', 'creditCards', 'loans', 'debtExtraPayment'] },
    { title: 'Ahorros y objetivos', short: 'Objetivos', description: 'Fondo, vivienda, proyectos', help: 'Definí tu colchón actual y el objetivo que querés construir.', fields: ['emergencyFund', 'savingsGoal', 'goalName'] },
    { title: 'Resumen y plan', short: 'Resumen', description: 'Diagnóstico y próximos pasos', help: 'Revisá tu distribución y exportá una copia de tus datos.', fields: [] }
  ];
  const FIELD_META = {
    monthlyIncome: ['Sueldo mensual', 'Tu ingreso principal del mes. Podés sumar partidas con +.'], extraIncome: ['Ingresos extra', 'Freelance, bonos o comisiones.'], otherIncome: ['Otros ingresos', 'Cualquier otra entrada mensual.'],
    rent: ['Alquiler o hipoteca', 'Incluí vivienda y expensas.'], utilities: ['Servicios', 'Luz, agua, internet y celular.'], food: ['Alimentación', 'Supermercado y comida esencial.'], transport: ['Transporte', 'Boletos, combustible, peajes o apps.'], insurance: ['Seguros', 'Auto, hogar, vida u otros.'], health: ['Salud', 'Mutualista, medicamentos y consultas.'], education: ['Educación', 'Cuotas, cursos y materiales.'], family: ['Familia', 'Cuidados, ayudas y responsabilidades.'], otherFixed: ['Otros gastos fijos', 'Compromisos que no entraron antes.'],
    entertainment: ['Entretenimiento y ocio', 'Salidas, actividades y hobbies.'], dining: ['Comidas fuera y cafés', 'Restaurantes, delivery y antojos.'], shopping: ['Compras y ropa', 'Compras personales ajustables.'], subscriptions: ['Suscripciones', 'Streaming, apps y membresías.'], otherVariable: ['Otros gastos variables', 'Gastos personales que cambian mes a mes.'],
    totalDebt: ['Deuda total activa', 'Saldo pendiente aproximado.'], creditCards: ['Pago mínimo de tarjetas', 'Pago mensual mínimo.'], loans: ['Préstamos y cuotas', 'Cuotas mensuales activas.'], debtExtraPayment: ['Pago extra posible', 'Aporte adicional para reducir deuda.'],
    emergencyFund: ['Fondo de emergencia actual', 'Dinero líquido disponible para imprevistos.'], savingsGoal: ['Monto objetivo', 'La cifra final que querés alcanzar.'], goalName: ['Nombre del objetivo', 'Ej.: fondo de emergencia, casa propia o viaje.']
  };
  let currentStepIndex = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function getValue(id) {
    const element = $(id);
    return element ? element.value : '';
  }

  function setValue(id, value) {
    const element = $(id);
    if (!element) return;
    element.value = value === 0 || value ? String(value) : '';
  }

  function ensureFieldMessage(element) {
    if (!element || element.dataset.errorReady === 'true') return;
    const message = document.createElement('div');
    message.className = 'field-feedback small mt-1';
    message.id = `${element.id}Feedback`;
    element.closest('.input-group')?.insertAdjacentElement('afterend', message);
    element.dataset.errorReady = 'true';
  }

  function setFieldState(id, result) {
    const element = $(id);
    if (!element) return;
    ensureFieldMessage(element);
    const feedback = $(`${id}Feedback`);
    element.classList.toggle('is-invalid', !result.valid);
    element.classList.toggle('is-valid-expression', result.valid && String(element.value || '').match(/[+\-]/));
    if (feedback) {
      feedback.textContent = result.valid ? '' : result.error;
      feedback.className = `field-feedback small mt-1 ${result.valid ? '' : 'text-danger'}`;
    }
  }

  function clearFieldStates() {
    CURRENCY_FIELD_IDS.forEach((id) => setFieldState(id, { valid: true, error: '' }));
  }

  function getStep() {
    return STEPS[currentStepIndex] || STEPS[0];
  }

  function formatCurrency(value) {
    return `${CONFIG.CURRENCY_SYMBOL}${Number(value || 0).toFixed(CONFIG.CURRENCY_DECIMALS).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  function normalizeNumberString(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (!value || typeof value !== 'string') return '';
    let clean = value.trim().replace(/\s/g, '');
    if (!clean) return '';
    const lastDot = clean.lastIndexOf('.');
    const lastComma = clean.lastIndexOf(',');
    if (lastDot > -1 && lastComma > -1) {
      clean = lastDot > lastComma ? clean.replace(/,/g, '') : clean.replace(/\./g, '').replace(',', '.');
    } else if (lastComma > -1) {
      const parts = clean.split(',');
      clean = parts[1] && parts[1].length <= 2 ? clean.replace(',', '.') : clean.replace(/,/g, '');
    } else if ((clean.match(/\./g) || []).length > 1) {
      clean = clean.replace(/\./g, '');
    }
    return clean;
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const clean = normalizeNumberString(value);
    if (!clean) return 0;
    return Number.parseFloat(clean) || 0;
  }

  function parseExpressionNumber(value) {
    if (typeof value === 'number') {
      return { value: Number.isFinite(value) ? value : 0, valid: Number.isFinite(value), error: Number.isFinite(value) ? '' : 'Ingresá un número válido.' };
    }

    const original = String(value || '').trim();
    if (!original) return { value: 0, valid: true, error: '' };

    const expression = original.replace(/\$/g, '').replace(/\s/g, '');
    if (!/^[0-9.,+\-]+$/.test(expression)) {
      return { value: 0, valid: false, error: 'Usá solo números, puntos, comas, + o -.' };
    }

    let index = 0;
    let operator = 1;
    let total = 0;
    let sawNumber = false;

    if (expression[0] === '+' || expression[0] === '-') {
      operator = expression[0] === '-' ? -1 : 1;
      index = 1;
    }

    while (index < expression.length) {
      let token = '';
      while (index < expression.length && expression[index] !== '+' && expression[index] !== '-') {
        token += expression[index];
        index += 1;
      }

      if (!token || !/[0-9]/.test(token)) {
        return { value: 0, valid: false, error: 'Revisá la operación. Ejemplo válido: 1500+3000-200.' };
      }

      const normalized = normalizeNumberString(token);
      if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
        return { value: 0, valid: false, error: 'Hay un número que no se pudo interpretar.' };
      }

      total += operator * Number.parseFloat(normalized);
      sawNumber = true;

      if (index < expression.length) {
        operator = expression[index] === '-' ? -1 : 1;
        index += 1;
        if (index >= expression.length || expression[index] === '+' || expression[index] === '-') {
          return { value: 0, valid: false, error: 'La operación quedó incompleta.' };
        }
      }
    }

    return { value: roundToTwo(total), valid: sawNumber, error: sawNumber ? '' : 'Ingresá un número válido.' };
  }

  function readCurrencyField(id, options = {}) {
    const result = parseExpressionNumber(getValue(id));
    if (options.mark !== false) setFieldState(id, result);
    return result.valid ? result.value : 0;
  }

  function validateCurrencyFields(options = {}) {
    return CURRENCY_FIELD_IDS.reduce((valid, id) => {
      const result = parseExpressionNumber(getValue(id));
      if (options.mark !== false) setFieldState(id, result);
      return valid && result.valid;
    }, true);
  }

  function roundToTwo(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function calculatePercentage(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
  }

  function defaultFinanceData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: null,
      incomes: { sueldo: 0, extra: 0, otros: 0 },
      expenses: {
        fixed: {
          vivienda: 0,
          servicios: 0,
          alimentacion: 0,
          transporte: 0,
          salud: 0,
          educacion: 0,
          familia: 0,
          otros: 0
        },
        variable: {
          ocio: 0,
          alimentacion: 0,
          otros: 0
        }
      },
      debts: {
        total: 0,
        minimumMonthly: 0,
        loanMonthly: 0,
        extraMonthly: 0
      },
      goals: [{ name: '', amount: 0 }],
      emergencyFund: { current: 0 },
      estimatedSavingCapacity: 0
    };
  }

  function normalizeFinanceData(raw) {
    const base = defaultFinanceData();
    const data = raw && typeof raw === 'object' ? raw : {};
    const normalized = {
      ...base,
      schemaVersion: String(data.schemaVersion || data.version || SCHEMA_VERSION),
      exportedAt: data.exportedAt || null,
      incomes: { ...base.incomes, ...(data.incomes || {}) },
      expenses: {
        fixed: { ...base.expenses.fixed, ...(data.expenses?.fixed || {}) },
        variable: { ...base.expenses.variable, ...(data.expenses?.variable || {}) }
      },
      debts: { ...base.debts, ...(data.debts || {}) },
      goals: Array.isArray(data.goals) && data.goals.length ? data.goals : base.goals,
      emergencyFund: { ...base.emergencyFund, ...(data.emergencyFund || {}) },
      estimatedSavingCapacity: parseNumber(data.estimatedSavingCapacity)
    };

    Object.keys(normalized.incomes).forEach((key) => normalized.incomes[key] = parseNumber(normalized.incomes[key]));
    Object.keys(normalized.expenses.fixed).forEach((key) => normalized.expenses.fixed[key] = parseNumber(normalized.expenses.fixed[key]));
    Object.keys(normalized.expenses.variable).forEach((key) => normalized.expenses.variable[key] = parseNumber(normalized.expenses.variable[key]));
    Object.keys(normalized.debts).forEach((key) => normalized.debts[key] = parseNumber(normalized.debts[key]));
    normalized.emergencyFund.current = parseNumber(normalized.emergencyFund.current);
    normalized.goals = normalized.goals.map((goal) => ({
      name: String(goal?.name || ''),
      amount: parseNumber(goal?.amount)
    }));

    return normalized;
  }

  function readFormData() {
    return normalizeFinanceData({
      incomes: {
        sueldo: readCurrencyField('monthlyIncome'),
        extra: readCurrencyField('extraIncome'),
        otros: readCurrencyField('otherIncome')
      },
      expenses: {
        fixed: {
          vivienda: readCurrencyField('rent'),
          servicios: readCurrencyField('utilities'),
          alimentacion: readCurrencyField('food'),
          transporte: readCurrencyField('transport'),
          salud: readCurrencyField('health'),
          educacion: readCurrencyField('education'),
          familia: readCurrencyField('family'),
          otros: readCurrencyField('insurance') + readCurrencyField('otherFixed')
        },
        variable: {
          ocio: readCurrencyField('entertainment') + readCurrencyField('dining'),
          alimentacion: 0,
          otros: readCurrencyField('shopping') + readCurrencyField('subscriptions') + readCurrencyField('otherVariable')
        }
      },
      debts: {
        total: readCurrencyField('totalDebt'),
        minimumMonthly: readCurrencyField('creditCards'),
        loanMonthly: readCurrencyField('loans'),
        extraMonthly: readCurrencyField('debtExtraPayment')
      },
      goals: [{ name: getValue('goalName'), amount: readCurrencyField('savingsGoal') }],
      emergencyFund: { current: readCurrencyField('emergencyFund') }
    });
  }

  function writeFormData(data) {
    const normalized = normalizeFinanceData(data);
    setValue('monthlyIncome', normalized.incomes.sueldo);
    setValue('extraIncome', normalized.incomes.extra);
    setValue('otherIncome', normalized.incomes.otros);
    setValue('rent', normalized.expenses.fixed.vivienda);
    setValue('utilities', normalized.expenses.fixed.servicios);
    setValue('food', normalized.expenses.fixed.alimentacion);
    setValue('transport', normalized.expenses.fixed.transporte);
    setValue('health', normalized.expenses.fixed.salud);
    setValue('education', normalized.expenses.fixed.educacion);
    setValue('family', normalized.expenses.fixed.familia);
    setValue('insurance', 0);
    setValue('otherFixed', normalized.expenses.fixed.otros);
    setValue('entertainment', normalized.expenses.variable.ocio);
    setValue('dining', 0);
    setValue('shopping', 0);
    setValue('subscriptions', 0);
    setValue('otherVariable', normalized.expenses.variable.otros);
    setValue('totalDebt', normalized.debts.total);
    setValue('creditCards', normalized.debts.minimumMonthly);
    setValue('loans', normalized.debts.loanMonthly);
    setValue('debtExtraPayment', normalized.debts.extraMonthly);
    setValue('emergencyFund', normalized.emergencyFund.current);
    setValue('savingsGoal', normalized.goals[0]?.amount || 0);
    setValue('goalName', normalized.goals[0]?.name || '');
  }

  function sumValues(object) {
    return Object.values(object || {}).reduce((sum, value) => sum + parseNumber(value), 0);
  }

  function calculateDebtSimulation(data) {
    const total = data.debts.total;
    const minimum = data.debts.minimumMonthly + data.debts.loanMonthly;
    const extra = data.debts.extraMonthly;
    const monthsMinimum = total > 0 && minimum > 0 ? Math.ceil(total / minimum) : 0;
    const monthsWithExtra = total > 0 && minimum + extra > 0 ? Math.ceil(total / (minimum + extra)) : 0;
    return {
      total,
      minimum,
      extra,
      monthsMinimum,
      monthsWithExtra,
      difference: monthsMinimum && monthsWithExtra ? Math.max(0, monthsMinimum - monthsWithExtra) : 0,
      active: total > 0 || minimum > 0
    };
  }

  function calculateFinancialDiagnosis(data) {
    const totalIncome = sumValues(data.incomes);
    if (totalIncome <= 0) throw new Error('El ingreso mensual debe ser mayor a 0');

    const fixedExpenses = sumValues(data.expenses.fixed);
    const variableExpenses = sumValues(data.expenses.variable);
    const monthlyDebtPayment = data.debts.minimumMonthly + data.debts.loanMonthly;
    const totalExpenses = fixedExpenses + variableExpenses + monthlyDebtPayment;
    const monthlyBalance = totalIncome - totalExpenses;
    const savingCapacity = monthlyBalance;
    const essentialSpending = fixedExpenses + monthlyDebtPayment;
    const essentialPercentage = calculatePercentage(essentialSpending, totalIncome);
    const debtSimulation = calculateDebtSimulation(data);
    const emergencyTargets = {
      oneMonth: totalExpenses,
      threeMonths: totalExpenses * 3,
      sixMonths: totalExpenses * 6
    };
    const emergencyProgress = emergencyTargets.threeMonths > 0
      ? Math.min(100, calculatePercentage(data.emergencyFund.current, emergencyTargets.threeMonths))
      : 0;
    const investmentAllowed = monthlyBalance > 0 && !debtSimulation.active && data.emergencyFund.current >= emergencyTargets.oneMonth;

    return {
      data,
      totalIncome: roundToTwo(totalIncome),
      fixedExpenses: roundToTwo(fixedExpenses),
      variableExpenses: roundToTwo(variableExpenses),
      monthlyDebtPayment: roundToTwo(monthlyDebtPayment),
      totalExpenses: roundToTwo(totalExpenses),
      totalCommitted: roundToTwo(totalExpenses),
      monthlyBalance: roundToTwo(monthlyBalance),
      availableMonthly: roundToTwo(monthlyBalance),
      savingCapacity: roundToTwo(savingCapacity),
      actualSavings: roundToTwo(Math.max(0, savingCapacity)),
      essentialSpending: roundToTwo(essentialSpending),
      essentialPercentage,
      emergencyTargets,
      emergencyProgress,
      debtSimulation,
      investmentAllowed,
      recommendation: buildMainRecommendation(monthlyBalance, debtSimulation, data.emergencyFund.current, emergencyTargets.oneMonth),
      status: getFinancialStatus(savingCapacity, essentialPercentage),
      goals: data.goals,
      projections: calculateSavingsProjections(Math.max(0, savingCapacity)),
      scenarios: calculateSavingsScenarios(Math.max(0, savingCapacity)),
      percentages: {
        actual: {
          needs: calculatePercentage(essentialSpending, totalIncome),
          wants: calculatePercentage(variableExpenses, totalIncome),
          savings: calculatePercentage(Math.max(0, savingCapacity), totalIncome)
        },
        recommended: { needs: 70, wants: 10, savings: 20 }
      },
      recommended: {
        needs: totalIncome * 0.7,
        wants: totalIncome * 0.1,
        savings: totalIncome * 0.2
      },
      actual: {
        needs: essentialSpending,
        wants: variableExpenses,
        savings: Math.max(0, savingCapacity)
      },
      gauge: getGaugeState(totalIncome, totalExpenses, essentialPercentage, savingCapacity)
    };
  }

  function getGaugeState(totalIncome, totalExpenses, essentialPercentage, savingCapacity) {
    const spendingRatio = calculatePercentage(totalExpenses, totalIncome);
    const savingsPercentage = calculatePercentage(Math.max(0, savingCapacity), totalIncome);

    if (savingCapacity < 0 || spendingRatio > 100) {
      return {
        zone: 'danger',
        label: 'Zona de riesgo',
        pill: 'Rojo',
        message: 'Estás gastando más de lo que entra',
        ratio: spendingRatio,
        needle: 100
      };
    }

    if (essentialPercentage > 50 || savingsPercentage < 10 || spendingRatio > 80) {
      return {
        zone: 'warning',
        label: 'Zona ajustada',
        pill: 'Amarillo',
        message: essentialPercentage > 50
          ? 'Tus necesidades superan el 50% recomendado'
          : 'Tu ahorro disponible está por debajo de lo ideal',
        ratio: spendingRatio,
        needle: Math.min(100, spendingRatio)
      };
    }

    return {
      zone: 'success',
      label: 'Zona saludable',
      pill: 'Verde',
      message: 'Zona saludable',
      ratio: spendingRatio,
      needle: Math.min(100, spendingRatio)
    };
  }

  function getFinancialStatus(savingCapacity, essentialPercentage) {
    if (savingCapacity < 0) {
      return { status: 'at-risk', emoji: '🔴', label: 'Saldo negativo', color: 'danger', description: 'Los gastos superan los ingresos. La prioridad es reducir egresos o aumentar ingresos.' };
    }
    if (essentialPercentage > 70) {
      return { status: 'adjusted', emoji: '🟡', label: 'Muy comprometido', color: 'warning', description: 'El gasto esencial ocupa demasiado espacio. Conviene revisar deudas y costos fijos.' };
    }
    if (savingCapacity > 0) {
      return { status: 'healthy', emoji: '🟢', label: 'Con margen', color: 'success', description: 'Hay saldo mensual positivo. Podés ordenar prioridades y sostener un plan.' };
    }
    return { status: 'adjusted', emoji: '🟡', label: 'Equilibrio justo', color: 'warning', description: 'No hay margen de ahorro. Conviene ajustar gastos variables o fijos.' };
  }

  function buildMainRecommendation(balance, debt, emergencyCurrent, emergencyOneMonth) {
    if (balance < 0) return 'Prioridad: corregir el saldo negativo antes de pensar en inversión o nuevos objetivos.';
    if (debt.active) return 'Prioridad: estabilizar y reducir deuda activa. La inversión no debería ser el foco principal todavía.';
    if (emergencyCurrent < emergencyOneMonth) return 'Prioridad: construir al menos un mes de gastos como fondo de emergencia.';
    return 'Situación ordenada: podés sostener ahorro, fortalecer el fondo y evaluar inversión prudente sin prometer rentabilidad.';
  }

  function calculateSavingsProjections(monthlySaving) {
    return { threeMonths: monthlySaving * 3, sixMonths: monthlySaving * 6, twelveMonths: monthlySaving * 12 };
  }

  function calculateSavingsScenarios(monthlySaving) {
    return Object.entries(CONFIG.SCENARIOS).map(([name, factor]) => ({
      name,
      monthly: roundToTwo(monthlySaving * factor),
      threeMonths: roundToTwo(monthlySaving * factor * 3),
      sixMonths: roundToTwo(monthlySaving * factor * 6),
      twelveMonths: roundToTwo(monthlySaving * factor * 12)
    }));
  }

  function generateRecommendations(diagnosis) {
    const recommendations = [];
    if (diagnosis.monthlyBalance < 0) {
      recommendations.push({ type: 'danger', title: 'Ahorro negativo', message: 'Tu saldo mensual es negativo. Reducí gastos no esenciales, revisá deuda o buscá mejorar ingresos antes de asumir nuevos compromisos.' });
    }
    if (diagnosis.essentialPercentage > 50) {
      recommendations.push({ type: 'warning', title: 'Gasto esencial elevado', message: `El gasto esencial representa ${diagnosis.essentialPercentage.toFixed(1)}% de tus ingresos. Revisá vivienda, servicios, transporte y deuda.` });
    }
    if (diagnosis.debtSimulation.active) {
      recommendations.push({ type: 'warning', title: 'Deuda activa', message: 'Con deuda activa, conviene priorizar un plan de pagos y evitar tratar la inversión como prioridad principal.' });
    }
    if (diagnosis.monthlyBalance >= 0 && diagnosis.emergencyProgress < 100) {
      recommendations.push({ type: 'info', title: 'Fondo de emergencia', message: 'Antes de objetivos más ambiciosos, buscá acercarte al menos a 3 meses de gastos cubiertos.' });
    }
    if (diagnosis.investmentAllowed) {
      recommendations.push({ type: 'success', title: 'Inversión prudente', message: 'Podés evaluar opciones prudentes y líquidas, sin prometer rentabilidad ni comprometer tu fondo de emergencia.' });
    }
    if (!recommendations.length) {
      recommendations.push({ type: 'success', title: 'Diagnóstico estable', message: 'La situación es manejable. Mantené seguimiento mensual y ajustes pequeños.' });
    }
    return recommendations;
  }

  function buildEditableExport(data) {
    return { ...normalizeFinanceData(data), schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
  }

  function buildDiagnosisSummary(diagnosis) {
    const debt = diagnosis.debtSimulation;
    const lines = [
      'Diagnóstico financiero personal',
      `Ingresos: ${formatCurrency(diagnosis.totalIncome)}`,
      `Gastos: ${formatCurrency(diagnosis.totalExpenses)}`,
      `Saldo mensual: ${formatCurrency(diagnosis.monthlyBalance)}`,
      `Capacidad de ahorro: ${formatCurrency(diagnosis.savingCapacity)}`,
      `Gasto esencial: ${diagnosis.essentialPercentage.toFixed(1)}%`,
      `Deuda: ${debt.active ? `${formatCurrency(debt.total)} total, ${debt.monthsMinimum || '-'} meses mínimo, ${debt.monthsWithExtra || '-'} meses con extra` : 'sin deuda activa'}`,
      `Fondo de emergencia: ${formatCurrency(diagnosis.data.emergencyFund.current)} (${diagnosis.emergencyProgress.toFixed(1)}% del objetivo de 3 meses)`,
      `Recomendación principal: ${diagnosis.recommendation}`,
      'Escenarios:',
      ...diagnosis.scenarios.map((scenario) => `- ${scenario.name}: 3m ${formatCurrency(scenario.threeMonths)}, 6m ${formatCurrency(scenario.sixMonths)}, 12m ${formatCurrency(scenario.twelveMonths)}`)
    ];
    return lines.join('\n');
  }

  function validateImportedData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('El archivo no contiene un objeto JSON válido.');
    if (!raw.incomes && !raw.expenses && !raw.debts && !raw.emergencyFund) throw new Error('El archivo no parece ser una exportación financiera compatible.');
    return normalizeFinanceData(raw);
  }

  function downloadText(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function displayResults(diagnosis, options = {}) {
    const results = $('resultsSection');
    if (results) results.style.display = 'block';
    displayRecommendations(diagnosis);
    displayFinancialGauge(diagnosis);
    displayBudgetCards(diagnosis);
    setText('summaryIncome', formatCurrency(diagnosis.totalIncome));
    setText('summaryCommitted', formatCurrency(diagnosis.totalExpenses));
    setText('summaryAvailable', formatCurrency(diagnosis.monthlyBalance));
    setText('summarySavingCapacity', formatCurrency(diagnosis.savingCapacity));
    setText('statusEmoji', diagnosis.status.emoji);
    setText('statusLabel', diagnosis.status.label);
    setText('statusDescription', diagnosis.status.description);
    const statusCard = $('statusCard');
    if (statusCard) statusCard.className = `card border-0 shadow-sm status-${diagnosis.status.status}`;
    displayDistribution(diagnosis);
    setText('breakdownFixed', formatCurrency(diagnosis.fixedExpenses));
    setText('breakdownVariable', formatCurrency(diagnosis.variableExpenses));
    setText('breakdownDebt', formatCurrency(diagnosis.monthlyDebtPayment));
    displayProjections(diagnosis);
    displayInsights(diagnosis);
    displayDebtSimulation(diagnosis);
    displayEmergencyFund(diagnosis);
    displayInvestmentGuidance(diagnosis);
    setValue('diagnosisSummary', buildDiagnosisSummary(diagnosis));
    if (options.scroll !== false) setTimeout(() => results?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function resetDashboard() {
    setText('dashboardIncome', formatCurrency(0));
    setText('gaugeZoneLabel', 'Cargá tus datos');
    setText('gaugeZonePill', 'Inicio');
    setText('gaugeSpendingRatio', '0% usado');
    setText('gaugeMessage', 'Empezá por tu sueldo mensual.');
    setText('dashboardAlertTitle', 'Diagnóstico listo para empezar');
    setText('dashboardAlertText', 'A medida que avances, vamos recalculando todo.');
    const needle = $('gaugeNeedle');
    if (needle) needle.style.transform = 'translateX(-50%) rotate(-90deg)';
    ['needs', 'wants', 'savings'].forEach((prefix) => {
      setText(`${prefix}CardAmount`, formatCurrency(0));
      setText(`${prefix}CardStatus`, prefix === 'savings' ? 'Objetivo 20%' : `Hasta ${prefix === 'needs' ? '50' : '30'}%`);
      setBar(`${prefix}CardBar`, 0);
      setBarState(`${prefix}CardBar`, 'success');
    });
    const alert = $('savingsAlert');
    if (alert) {
      alert.className = 'alert mb-0 alert-light';
      alert.textContent = 'Tu ahorro posible hoy es de $0.00';
    }
    const recommendations = $('recommendationsAlert');
    if (recommendations) recommendations.innerHTML = '';
    updateZoneClasses('success');
  }

  function setText(id, text) {
    const element = $(id);
    if (element) element.textContent = text;
  }

  function displayRecommendations(diagnosis) {
    const container = $('recommendationsAlert');
    if (!container) return;
    container.innerHTML = generateRecommendations(diagnosis).map((item) => `
      <div class="alert ${getAlertClass(item.type)} border-0 shadow-sm" role="alert">
        <h4 class="alert-heading">${item.title}</h4>
        <p class="mb-0">${item.message}</p>
      </div>
    `).join('');
  }

  function getAlertClass(type) {
    return { warning: 'alert-warning', success: 'alert-success', danger: 'alert-danger', info: 'alert-info' }[type] || 'alert-info';
  }

  function displayDistribution(diagnosis) {
    setText('needsPercentage', `${diagnosis.percentages.actual.needs.toFixed(1)}% / 50%`);
    setText('wantsPercentage', `${diagnosis.percentages.actual.wants.toFixed(1)}% / 30%`);
    setText('savingsPercentage', `${diagnosis.percentages.actual.savings.toFixed(1)}% / 20%`);
    setText('needsRecommended', formatCurrency(diagnosis.recommended.needs));
    setText('wantsRecommended', formatCurrency(diagnosis.recommended.wants));
    setText('savingsRecommended', formatCurrency(diagnosis.recommended.savings));
    setText('needsActual', formatCurrency(diagnosis.actual.needs));
    setText('wantsActual', formatCurrency(diagnosis.actual.wants));
    setText('savingsActual', formatCurrency(diagnosis.actual.savings));
    setBar('needsBar', diagnosis.percentages.actual.needs);
    setBar('wantsBar', diagnosis.percentages.actual.wants);
    setBar('savingsBar', diagnosis.percentages.actual.savings);
    setBarState('needsBar', getCategoryState(diagnosis.percentages.actual.needs, 50, false));
    setBarState('wantsBar', getCategoryState(diagnosis.percentages.actual.wants, 30, false));
    setBarState('savingsBar', getCategoryState(diagnosis.percentages.actual.savings, 20, true));
  }

  function setBar(id, percentage) {
    const bar = $(id);
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
  }

  function setBarState(id, state) {
    const bar = $(id);
    if (!bar) return;
    bar.classList.remove('bar-success', 'bar-warning', 'bar-danger');
    bar.classList.add(`bar-${state}`);
  }

  function getCategoryState(actualPercentage, recommendedPercentage, higherIsBetter) {
    if (higherIsBetter) {
      if (actualPercentage >= recommendedPercentage) return 'success';
      if (actualPercentage >= recommendedPercentage / 2) return 'warning';
      return 'danger';
    }

    if (actualPercentage <= recommendedPercentage) return 'success';
    if (actualPercentage <= recommendedPercentage * 1.2) return 'warning';
    return 'danger';
  }

  function displayFinancialGauge(diagnosis) {
    const gauge = diagnosis.gauge;
    const needle = $('gaugeNeedle');
    const angle = -90 + (Math.max(0, Math.min(100, gauge.needle)) * 1.8);
    if (needle) needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    setText('dashboardIncome', formatCurrency(diagnosis.totalIncome));
    setText('gaugeZoneLabel', gauge.label);
    setText('gaugeZonePill', gauge.pill);
    setText('gaugeSpendingRatio', `${Math.min(999, gauge.ratio).toFixed(1)}% usado`);
    setText('gaugeMessage', gauge.message);
    setText('dashboardAlertTitle', gauge.message);
    setText('dashboardAlertText', buildDashboardAlertText(diagnosis));
    updateZoneClasses(gauge.zone);
  }

  function updateZoneClasses(zone) {
    ['gaugeZoneLabel', 'gaugeZonePill', 'gaugeMessage'].forEach((id) => {
      const element = $(id);
      if (!element) return;
      element.classList.remove('zone-success', 'zone-warning', 'zone-danger');
      element.classList.add(`zone-${zone}`);
    });
    const alert = $('dashboardAlert');
    if (alert) {
      alert.classList.remove('dashboard-alert-success', 'dashboard-alert-warning', 'dashboard-alert-danger');
      alert.classList.add(`dashboard-alert-${zone}`);
    }
  }

  function buildDashboardAlertText(diagnosis) {
    if (diagnosis.savingCapacity < 0) return 'Te recomendamos ajustar gastos o revisar ingresos cuanto antes.';
    if (diagnosis.essentialPercentage > 50) return 'Las necesidades superan la referencia del 50%.';
    if (diagnosis.percentages.actual.savings < 20) return 'Todavía hay margen para acercarte al 20% de ahorro.';
    return 'Buen equilibrio: tu ahorro está alineado con la referencia.';
  }

  function displayBudgetCards(diagnosis) {
    updateBudgetCard('needs', diagnosis.actual.needs, diagnosis.percentages.actual.needs, 50, false);
    updateBudgetCard('wants', diagnosis.actual.wants, diagnosis.percentages.actual.wants, 30, false);
    updateBudgetCard('savings', diagnosis.actual.savings, diagnosis.percentages.actual.savings, 20, true);

    const alert = $('savingsAlert');
    if (alert) {
      const state = diagnosis.savingCapacity < 0 ? 'danger' : diagnosis.percentages.actual.savings < 10 ? 'warning' : 'success';
      alert.className = `alert mt-3 mb-0 alert-${state === 'danger' ? 'danger' : state === 'warning' ? 'warning' : 'success'}`;
      alert.textContent = diagnosis.savingCapacity < 0
        ? `Tu ahorro posible hoy es negativo: ${formatCurrency(diagnosis.savingCapacity)}`
        : `Tu ahorro posible hoy es de ${formatCurrency(diagnosis.savingCapacity)}`;
    }
  }

  function updateBudgetCard(prefix, amount, percentage, recommended, higherIsBetter) {
    const state = getCategoryState(percentage, recommended, higherIsBetter);
    const card = $(`${prefix}Card`);
    if (card) {
      card.classList.remove('budget-success', 'budget-warning', 'budget-danger');
      card.classList.add(`budget-${state}`);
    }

    setText(`${prefix}CardAmount`, formatCurrency(amount));
    setText(`${prefix}CardStatus`, buildCategoryLabel(prefix, percentage, recommended, state));
    setBar(`${prefix}CardBar`, percentage);
    setBarState(`${prefix}CardBar`, state);
  }

  function buildCategoryLabel(prefix, percentage, recommended, state) {
    if (prefix === 'savings') {
      if (state === 'success') return `${percentage.toFixed(1)}% - objetivo logrado`;
      if (state === 'warning') return `${percentage.toFixed(1)}% - ahorro bajo`;
      return `${percentage.toFixed(1)}% - alerta de ahorro`;
    }

    if (state === 'success') return `${percentage.toFixed(1)}% de ${recommended}% recomendado`;
    if (state === 'warning') return `${percentage.toFixed(1)}% - cerca del límite`;
    return `${percentage.toFixed(1)}% - supera lo recomendado`;
  }

  function displayProjections(diagnosis) {
    const container = $('projectionContainer');
    if (!container) return;
    container.innerHTML = diagnosis.scenarios.map((scenario) => `
      <div class="col-md-4">
        <div class="finance-mini-card h-100">
          <p class="text-muted small mb-2 text-capitalize">${scenario.name}</p>
          <p class="mb-1">3 meses: <strong>${formatCurrency(scenario.threeMonths)}</strong></p>
          <p class="mb-1">6 meses: <strong>${formatCurrency(scenario.sixMonths)}</strong></p>
          <p class="mb-0">12 meses: <strong>${formatCurrency(scenario.twelveMonths)}</strong></p>
        </div>
      </div>
    `).join('');

    const goal = diagnosis.goals[0];
    const goalSection = $('savingsGoalSection');
    if (goalSection && goal?.amount > 0 && diagnosis.actualSavings > 0) {
      const months = Math.ceil(goal.amount / diagnosis.actualSavings);
      const target = new Date();
      target.setMonth(target.getMonth() + months);
      goalSection.style.display = 'block';
      setText('monthsToGoal', `${months} meses`);
      setText('goalDate', target.toLocaleDateString('es-UY', { year: 'numeric', month: 'long' }));
    } else if (goalSection) {
      goalSection.style.display = 'none';
    }
  }

  function displayInsights(diagnosis) {
    const container = $('insightsContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="mb-4">
        <h4 class="h6 fw-bold">Diagnóstico</h4>
        <p>Total ingresos: <strong>${formatCurrency(diagnosis.totalIncome)}</strong>. Total gastos: <strong>${formatCurrency(diagnosis.totalExpenses)}</strong>. Saldo mensual: <strong>${formatCurrency(diagnosis.monthlyBalance)}</strong>.</p>
      </div>
      <div class="mb-0">
        <h4 class="h6 fw-bold">Recomendación principal</h4>
        <p>${diagnosis.recommendation}</p>
      </div>
    `;
  }

  function displayDebtSimulation(diagnosis) {
    const container = $('debtSimulationContainer');
    if (!container) return;
    const debt = diagnosis.debtSimulation;
    container.innerHTML = debt.active ? `
      <p>Deuda total: <strong>${formatCurrency(debt.total)}</strong></p>
      <p>Meses pagando mínimo: <strong>${debt.monthsMinimum || '-'}</strong></p>
      <p>Meses con pago extra: <strong>${debt.monthsWithExtra || '-'}</strong></p>
      <p>Diferencia estimada: <strong>${debt.difference}</strong> meses</p>
      <p class="small text-warning mb-0">Con deuda activa, la inversión no debería ser la prioridad principal.</p>
    ` : '<p class="mb-0 text-success">No se detecta deuda activa.</p>';
  }

  function displayEmergencyFund(diagnosis) {
    const container = $('emergencyFundContainer');
    if (!container) return;
    container.innerHTML = `
      <p>Actual: <strong>${formatCurrency(diagnosis.data.emergencyFund.current)}</strong></p>
      <p>1 mes: <strong>${formatCurrency(diagnosis.emergencyTargets.oneMonth)}</strong></p>
      <p>3 meses: <strong>${formatCurrency(diagnosis.emergencyTargets.threeMonths)}</strong></p>
      <p>6 meses: <strong>${formatCurrency(diagnosis.emergencyTargets.sixMonths)}</strong></p>
      <div class="progress mb-2" style="height:8px;"><div class="progress-bar bg-success" style="width:${Math.min(100, diagnosis.emergencyProgress)}%"></div></div>
      <p class="small mb-0">Avance hacia 3 meses: ${diagnosis.emergencyProgress.toFixed(1)}%</p>
    `;
  }

  function displayInvestmentGuidance(diagnosis) {
    const container = $('investmentContainer');
    if (!container) return;
    container.innerHTML = diagnosis.investmentAllowed
      ? '<p class="text-success">Podría evaluarse como paso posible, priorizando liquidez, diversificación y bajo riesgo. No hay rentabilidad garantizada.</p>'
      : '<p class="text-muted">Todavía no aparece como prioridad. Primero corregí saldo negativo, deuda activa o fondo de emergencia mínimo.</p>';
  }

  function renderStepper() {
    const step = getStep();
    const input = $('stepAmountInput');
    setText('stepCounter', `${currentStepIndex + 1} de ${STEPS.length}`);
    setText('stepCategory', step.category);
    setText('stepTitle', step.title);
    setText('stepHelp', step.help);
    if (input) {
      input.value = getValue(step.id);
      input.focus();
      input.select();
    }
    const progress = $('stepProgressFill');
    if (progress) progress.style.width = `${((currentStepIndex + 1) / STEPS.length) * 100}%`;
    const back = $('stepBackBtn');
    if (back) back.disabled = currentStepIndex === 0;
    const next = $('stepNextBtn');
    if (next) next.textContent = currentStepIndex === STEPS.length - 1 ? 'Finalizar' : 'Siguiente';
    renderStepMap();
    updateStepFeedback();
  }

  function renderStepMap() {
    const container = $('stepMap');
    if (!container) return;
    container.innerHTML = STEPS.map((step, index) => {
      const value = getValue(step.id);
      const hasValue = String(value || '').trim() !== '';
      const state = index === currentStepIndex ? 'active' : hasValue ? 'done' : '';
      return `
        <button type="button" class="step-map-item ${state}" data-step-index="${index}">
          <span class="step-map-dot">${index + 1}</span>
          <span>${step.category}</span>
        </button>
      `;
    }).join('');
    container.querySelectorAll('[data-step-index]').forEach((button) => {
      button.addEventListener('click', () => {
        currentStepIndex = Number(button.dataset.stepIndex || 0);
        renderStepper();
      });
    });
  }

  function updateStepFeedback() {
    const input = $('stepAmountInput');
    const step = getStep();
    if (!input || !step) return;
    const result = parseExpressionNumber(input.value);
    const feedback = $('stepFeedback');
    const validMark = $('stepValidMark');
    input.classList.toggle('is-invalid', !result.valid);
    input.classList.toggle('is-valid-expression', result.valid && String(input.value || '').match(/[+\-]/));
    if (validMark) validMark.style.opacity = result.valid && String(input.value || '').trim() ? '1' : '0.25';
    if (!feedback) return;
    if (!result.valid) {
      feedback.className = 'step-feedback small mt-3 text-danger';
      feedback.textContent = result.error;
    } else {
      feedback.className = 'step-feedback small mt-3 text-success';
      feedback.textContent = `Se calculará: ${formatCurrency(result.value)}. También podés escribir 0.`;
    }
  }

  function syncStepInput() {
    const step = getStep();
    const input = $('stepAmountInput');
    if (!step || !input) return;
    setValue(step.id, input.value);
    const result = parseExpressionNumber(input.value);
    setFieldState(step.id, result);
    updateStepFeedback();
    updateLiveDiagnosis();
    renderStepMap();
  }

  function goToNextStep() {
    const step = getStep();
    const result = parseExpressionNumber(getValue(step.id));
    setFieldState(step.id, result);
    if (!result.valid) {
      updateStepFeedback();
      $('stepAmountInput')?.focus();
      return;
    }
    if (currentStepIndex < STEPS.length - 1) {
      currentStepIndex += 1;
      renderStepper();
    } else {
      runDiagnosis({ scroll: false });
      setText('fileStatus', 'Diagnóstico completo. Podés ajustar cualquier paso desde el mapa.');
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex <= 0) return;
    currentStepIndex -= 1;
    renderStepper();
  }

  function validateForm(options = {}) {
    if (!validateCurrencyFields({ mark: true })) {
      setText('fileStatus', 'Hay una operación inválida. Corregila para actualizar el diagnóstico.');
      if (!options.silent) {
        const firstInvalid = document.querySelector?.('.form-control.is-invalid');
        firstInvalid?.focus();
      }
      return false;
    }

    if (sumValues(readFormData().incomes) <= 0) {
      if (options.silent) return false;
      setText('fileStatus', 'Ingresá al menos un ingreso mensual mayor a 0.');
      return false;
    }
    return true;
  }

  function runDiagnosis(options = {}) {
    if (!validateForm(options)) return null;
    const data = readFormData();
    const diagnosis = calculateFinancialDiagnosis(data);
    displayResults(diagnosis, options);
    setText('fileStatus', options.live ? 'Diagnóstico actualizado en tiempo real.' : '');
    return diagnosis;
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    try {
      runDiagnosis();
    } catch (error) {
      setText('fileStatus', `Error: ${error.message}`);
    }
  }

  function updateLiveDiagnosis() {
    const hasInput = CURRENCY_FIELD_IDS.some((id) => String(getValue(id) || '').trim());
    if (!hasInput) {
      clearFieldStates();
      resetDashboard();
      setText('fileStatus', '');
      return;
    }

    try {
      runDiagnosis({ silent: true, scroll: false, live: true });
    } catch (error) {
      setText('fileStatus', `No se pudo actualizar todavía: ${error.message}`);
    }
  }

  function exportData() {
    const data = buildEditableExport(readFormData());
    downloadText(`finanzas-personales-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    setText('fileStatus', 'Datos exportados como archivo JSON local.');
  }

  function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const data = validateImportedData(parsed);
        writeFormData(data);
        setText('fileStatus', 'Archivo importado correctamente. Revisá los datos y calculá el diagnóstico.');
        updateLiveDiagnosis();
        renderStepper();
      } catch (error) {
        setText('fileStatus', `Error al importar: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function copySummary() {
    const summary = getValue('diagnosisSummary');
    if (!summary) return;
    navigator.clipboard?.writeText(summary).then(() => {
      setText('fileStatus', 'Resumen copiado al portapapeles.');
    }).catch(() => {
      setText('fileStatus', 'No se pudo copiar automáticamente. Seleccioná el resumen y copialo manualmente.');
    });
  }

  function downloadSummary() {
    const diagnosis = runDiagnosis();
    if (!diagnosis) return;
    downloadText(`resumen-financiero-${new Date().toISOString().slice(0, 10)}.txt`, buildDiagnosisSummary(diagnosis), 'text/plain');
  }

  function init() {
    resetDashboard();
    $('financialForm')?.addEventListener('submit', handleFormSubmit);
    CURRENCY_FIELD_IDS.forEach((id) => {
      const element = $(id);
      ensureFieldMessage(element);
      element?.addEventListener('input', updateLiveDiagnosis);
    });
    renderStepper();
    $('stepAmountInput')?.addEventListener('input', syncStepInput);
    $('stepAmountInput')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        syncStepInput();
        goToNextStep();
      }
    });
    $('stepNextBtn')?.addEventListener('click', () => {
      syncStepInput();
      goToNextStep();
    });
    $('stepBackBtn')?.addEventListener('click', goToPreviousStep);
    $('goalName')?.addEventListener('input', updateLiveDiagnosis);
    $('exportDataBtn')?.addEventListener('click', exportData);
    $('importDataBtn')?.addEventListener('click', () => $('importFile')?.click());
    $('importFile')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) importDataFromFile(file);
      event.target.value = '';
    });
    $('copySummaryBtn')?.addEventListener('click', copySummary);
    $('downloadSummaryBtn')?.addEventListener('click', downloadSummary);
    $('financialForm')?.addEventListener('reset', () => {
      setTimeout(() => {
        const results = $('resultsSection');
        if (results) results.style.display = 'block';
        setText('fileStatus', '');
        clearFieldStates();
        currentStepIndex = 0;
        resetDashboard();
        renderStepper();
      }, 0);
    });
  }

  const visitedPlanSteps = new Set();

  function formatPlanCurrency(value) {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency', currency: 'UYU', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0
    }).format(Number(value) || 0).replace('UYU', '$');
  }

  function planFieldHasValue(id) {
    return String(getValue(id) || '').trim() !== '';
  }

  function isPlanStepComplete(index) {
    if (index === 0) return sumValues(readFormData().incomes) > 0 && visitedPlanSteps.has(index);
    if (index === 5) return visitedPlanSteps.has(index);
    return visitedPlanSteps.has(index);
  }

  function openPlanner() {
    $('welcomeScreen')?.setAttribute('hidden', '');
    $('plannerShell')?.removeAttribute('hidden');
    renderPlanExperience();
    window.requestAnimationFrame(() => $('stepEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function goToPlanStep(index, options = {}) {
    currentStepIndex = Math.max(0, Math.min(PLAN_STEPS.length - 1, Number(index) || 0));
    renderPlanExperience();
    if (options.scroll !== false) $('stepEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPlanNavigation() {
    const container = $('stepNavigation');
    if (!container) return;
    container.innerHTML = PLAN_STEPS.map((step, index) => {
      const complete = isPlanStepComplete(index);
      const state = index === currentStepIndex ? 'active' : complete ? 'complete' : 'pending';
      const marker = complete ? '<svg aria-hidden="true"><use href="#i-check"></use></svg>' : String(index + 1);
      return `<button type="button" class="step-nav-item ${state}" data-plan-step="${index}" aria-current="${index === currentStepIndex ? 'step' : 'false'}">
        <span class="step-nav-number">${marker}</span><span class="step-nav-copy"><strong>${step.title}</strong><small>${step.description}</small></span><svg aria-hidden="true"><use href="#i-arrow"></use></svg>
      </button>`;
    }).join('');
    container.querySelectorAll('[data-plan-step]').forEach((button) => button.addEventListener('click', () => goToPlanStep(button.dataset.planStep)));
    setText('overallStepLabel', `Paso ${currentStepIndex + 1} de ${PLAN_STEPS.length}`);
    const progress = $('overallProgress');
    if (progress) progress.style.width = `${((currentStepIndex + 1) / PLAN_STEPS.length) * 100}%`;
  }

  function fieldTemplate(id) {
    const [label, help] = FIELD_META[id];
    const original = getValue(id);
    const isText = id === 'goalName';
    const input = isText
      ? `<input class="text-input" id="ui-${id}" data-proxy-for="${id}" type="text" value="${escapeHtml(original)}" placeholder="Ej.: Casa propia">`
      : `<div class="money-input"><span aria-hidden="true">$</span><input id="ui-${id}" data-proxy-for="${id}" inputmode="decimal" value="${escapeHtml(original)}" placeholder="0" aria-describedby="ui-${id}-help"></div>`;
    return `<div class="field-group ${id === 'goalName' ? 'full' : ''}"><label for="ui-${id}">${label}</label>${input}<small id="ui-${id}-help">${help}</small><small class="field-feedback" id="ui-${id}-feedback" role="alert"></small></div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  function renderPlanEditor() {
    const step = PLAN_STEPS[currentStepIndex];
    setText('editorEyebrow', `Paso ${currentStepIndex + 1} de ${PLAN_STEPS.length}`);
    setText('editorTitle', step.title);
    setText('editorDescription', step.help);
    setText('editorState', isPlanStepComplete(currentStepIndex) ? 'Completado' : currentStepIndex === 5 ? 'Revisión' : 'En progreso');
    const fields = $('stepFields');
    if (fields) {
      fields.innerHTML = step.fields.length
        ? `<div class="field-grid">${step.fields.map(fieldTemplate).join('')}</div>`
        : `<div class="summary-message"><p>Tu panorama ya está listo para revisar. La distribución real se calcula con los datos que cargaste y la referencia 70/20/10 se mantiene como guía adaptable.</p></div>`;
      fields.querySelectorAll('[data-proxy-for]').forEach((input) => {
        input.addEventListener('input', () => syncProxyField(input));
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') { event.preventDefault(); syncProxyField(input); }
        });
      });
    }
    const back = $('stepBackBtn');
    if (back) back.disabled = currentStepIndex === 0;
    const next = $('stepNextBtn');
    if (next) next.innerHTML = currentStepIndex === PLAN_STEPS.length - 1
      ? 'Plan listo <svg aria-hidden="true"><use href="#i-check"></use></svg>'
      : 'Guardar y continuar <svg aria-hidden="true"><use href="#i-arrow"></use></svg>';
    const sideNext = $('sideNextBtn');
    if (sideNext) sideNext.hidden = currentStepIndex === PLAN_STEPS.length - 1;
    setText('sideNextLabel', PLAN_STEPS[Math.min(currentStepIndex + 1, PLAN_STEPS.length - 1)].title);
  }

  function syncProxyField(input) {
    const id = input.dataset.proxyFor;
    setValue(id, input.value);
    if (id !== 'goalName') {
      const parsed = parseExpressionNumber(input.value);
      input.parentElement?.classList.toggle('invalid', !parsed.valid);
      setText(`ui-${id}-feedback`, parsed.valid ? '' : parsed.error);
    }
    renderPlanData();
  }

  function validateCurrentPlanStep() {
    const step = PLAN_STEPS[currentStepIndex];
    let valid = true;
    step.fields.filter((id) => id !== 'goalName').forEach((id) => {
      const result = parseExpressionNumber(getValue(id));
      const proxy = $(`ui-${id}`);
      proxy?.parentElement?.classList.toggle('invalid', !result.valid);
      setText(`ui-${id}-feedback`, result.valid ? '' : result.error);
      valid = valid && result.valid;
    });
    if (currentStepIndex === 0 && sumValues(readFormData().incomes) <= 0) {
      const proxy = $('ui-monthlyIncome');
      proxy?.parentElement?.classList.add('invalid');
      setText('ui-monthlyIncome-feedback', 'Ingresá al menos un ingreso mensual mayor a 0.');
      valid = false;
    }
    return valid;
  }

  function advancePlan() {
    if (!validateCurrentPlanStep()) return;
    visitedPlanSteps.add(currentStepIndex);
    if (currentStepIndex < PLAN_STEPS.length - 1) goToPlanStep(currentStepIndex + 1);
    else {
      renderPlanExperience();
      setText('fileStatus', 'Plan completo. Podés editar cualquier etapa o exportar tus datos.');
    }
  }

  function getSafeDiagnosis() {
    const data = readFormData();
    if (sumValues(data.incomes) <= 0) return { data, diagnosis: null };
    try { return { data, diagnosis: calculateFinancialDiagnosis(data) }; }
    catch (error) { return { data, diagnosis: null }; }
  }

  function setActualRing(id, length, offset) {
    const circle = $(id);
    if (!circle) return;
    const safeLength = Math.max(0, Math.min(100, Number(length) || 0));
    circle.style.strokeDasharray = `${safeLength} ${100 - safeLength}`;
    circle.style.strokeDashoffset = String(-offset);
  }

  function renderDonut(data, diagnosis) {
    const income = diagnosis?.totalIncome || sumValues(data.incomes);
    setText('donutIncome', formatPlanCurrency(income));
    setText('donutNeedsAmount', `${formatPlanCurrency(income * .7)} objetivo`);
    setText('donutBuildAmount', `${formatPlanCurrency(income * .2)} objetivo`);
    setText('donutEnjoyAmount', `${formatPlanCurrency(income * .1)} objetivo`);

    const fixedReady = visitedPlanSteps.has(1);
    const variableReady = visitedPlanSteps.has(2);
    const debtReady = visitedPlanSteps.has(3);
    const completeForBalance = fixedReady && variableReady && debtReady;
    const needs = diagnosis && (fixedReady || debtReady) ? Math.min(100, diagnosis.percentages.actual.needs) : 0;
    const enjoy = diagnosis && variableReady ? Math.min(100, diagnosis.percentages.actual.wants) : 0;
    const build = diagnosis && completeForBalance ? Math.min(100, diagnosis.percentages.actual.savings) : 0;
    setActualRing('actualNeeds', needs, 0);
    setActualRing('actualBuild', build, needs);
    setActualRing('actualEnjoy', enjoy, needs + build);

    const note = $('partialDataNote');
    if (!income) {
      setText('dataCompleteness', 'Tu guía 70/20/10');
      setText('distributionIntro', 'Primero necesitamos conocer tus ingresos. Todavía no mostramos resultados para evitar conclusiones engañosas.');
      if (note) note.innerHTML = '<svg aria-hidden="true"><use href="#i-info"></use></svg><span>Ingresá tu ingreso mensual para calcular montos de referencia.</span>';
    } else if (!completeForBalance) {
      setText('dataCompleteness', 'Distribución parcial');
      setText('distributionIntro', 'La referencia ya está calculada; el anillo exterior solo muestra las categorías que terminaste.');
      if (note) note.innerHTML = '<svg aria-hidden="true"><use href="#i-info"></use></svg><span>Resultado provisional: completá gastos fijos, variables y deudas para conocer tu saldo real.</span>';
    } else {
      setText('dataCompleteness', 'Panorama mensual completo');
      setText('distributionIntro', 'Compará tu distribución actual con la guía y adaptala a tu realidad.');
      if (note) note.innerHTML = `<svg aria-hidden="true"><use href="#i-info"></use></svg><span>${escapeHtml(diagnosis.recommendation)}</span>`;
    }
    const desc = $('donutDesc');
    if (desc) desc.textContent = completeForBalance && diagnosis
      ? `Distribución actual: ${needs.toFixed(1)} por ciento para vivir, ${build.toFixed(1)} para construir patrimonio y ${enjoy.toFixed(1)} para disfrutar.`
      : 'Guía objetivo 70, 20 y 10. La distribución actual todavía está incompleta.';
  }

  function renderMetrics(data, diagnosis) {
    const income = diagnosis?.totalIncome || sumValues(data.incomes);
    const expenses = diagnosis?.totalExpenses || 0;
    setText('metricIncome', formatPlanCurrency(income));
    setText('metricExpenses', diagnosis && (visitedPlanSteps.has(1) || visitedPlanSteps.has(2) || visitedPlanSteps.has(3)) ? formatPlanCurrency(expenses) : 'Pendiente');
    setText('metricDebt', visitedPlanSteps.has(3) ? formatPlanCurrency(data.debts.total) : 'Pendiente');
    setText('metricSavings', visitedPlanSteps.has(4) ? formatPlanCurrency(data.emergencyFund.current) : 'Pendiente');
  }

  function renderWealthPlan(data, diagnosis) {
    const target = (diagnosis?.totalIncome || sumValues(data.incomes)) * .2;
    const debtShare = data.debts.total > 0 ? .6 : 0;
    const fundShare = data.emergencyFund.current > 0 ? (debtShare ? .25 : .55) : (debtShare ? .35 : .7);
    const goalShare = Math.max(0, 1 - debtShare - fundShare);
    const items = [
      ['Reducir deudas', target * debtShare, debtShare],
      ['Fondo de emergencia', target * fundShare, fundShare],
      [data.goals[0]?.name || 'Otros objetivos', target * goalShare, goalShare]
    ];
    const list = $('wealthList');
    if (list) list.innerHTML = items.map(([label, amount, share]) => `<div class="wealth-item"><div class="wealth-item-head"><span>${escapeHtml(label)}</span><strong>${formatPlanCurrency(amount)}</strong></div><div class="mini-progress"><span style="width:${share * 100}%"></span></div></div>`).join('');
    setText('wealthAvailable', `Disponible según objetivo: ${formatPlanCurrency(target)}`);
    setText('wealthTotal', formatPlanCurrency(target));
  }

  function renderMonthlyPlan(data, diagnosis) {
    const items = [
      ['Cubrir gastos básicos', visitedPlanSteps.has(1), diagnosis ? formatPlanCurrency(diagnosis.fixedExpenses) : 'Pendiente'],
      ['Pagar mínimos de deudas', visitedPlanSteps.has(3), visitedPlanSteps.has(3) ? formatPlanCurrency(data.debts.minimumMonthly + data.debts.loanMonthly) : 'Pendiente'],
      ['Aportar a construcción patrimonial', Boolean(diagnosis && visitedPlanSteps.has(3)), diagnosis ? `${formatPlanCurrency(diagnosis.totalIncome * .2)} como referencia` : 'Pendiente'],
      ['Reservar dinero para disfrutar', visitedPlanSteps.has(2), diagnosis ? `${formatPlanCurrency(diagnosis.totalIncome * .1)} como referencia` : 'Pendiente']
    ];
    const container = $('monthlyPlan');
    if (container) container.innerHTML = items.map(([label, done, detail], index) => `<li><span class="plan-status ${done ? 'done' : index === currentStepIndex ? 'current' : ''}"><svg aria-hidden="true"><use href="#i-check"></use></svg></span><div><strong>${label}</strong><span>${detail}</span></div></li>`).join('');
  }

  function renderGoal(data) {
    const goal = data.goals[0] || { name: '', amount: 0 };
    const current = data.emergencyFund.current;
    const progress = goal.amount > 0 ? Math.min(100, calculatePercentage(current, goal.amount)) : 0;
    setText('primaryGoalName', goal.name || 'Definí tu objetivo');
    setText('primaryGoalCurrent', `${formatPlanCurrency(current)} acumulado`);
    setText('primaryGoalTarget', `${formatPlanCurrency(goal.amount)} objetivo`);
    setText('goalProgressText', `${progress.toFixed(0)}%`);
    const bar = $('goalProgressBar'); if (bar) bar.style.width = `${progress}%`;
  }

  function renderPlanData() {
    const { data, diagnosis } = getSafeDiagnosis();
    renderMetrics(data, diagnosis);
    renderDonut(data, diagnosis);
    renderWealthPlan(data, diagnosis);
    renderMonthlyPlan(data, diagnosis);
    renderGoal(data);
  }

  function renderPlanExperience() {
    renderPlanNavigation();
    renderPlanEditor();
    renderPlanData();
  }

  function exportPlanData() {
    const data = buildEditableExport(readFormData());
    downloadText(`finanzas-personales-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    setText('fileStatus', 'Datos exportados como JSON compatible con el esquema 2.0.0.');
  }

  function importPlanData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = validateImportedData(JSON.parse(String(reader.result || '')));
        writeFormData(data);
        PLAN_STEPS.slice(0, 5).forEach((_, index) => visitedPlanSteps.add(index));
        openPlanner();
        goToPlanStep(5, { scroll: false });
        setText('fileStatus', 'Datos importados correctamente. Revisá el resumen antes de continuar.');
      } catch (error) { setText('fileStatus', `Error al importar: ${error.message}`); }
    };
    reader.readAsText(file);
  }

  function resetPlan() {
    FIELD_IDS.forEach((id) => setValue(id, ''));
    visitedPlanSteps.clear();
    currentStepIndex = 0;
    setText('fileStatus', 'Plan reiniciado.');
    renderPlanExperience();
  }

  function modernInit() {
    $('startPlanBtn')?.addEventListener('click', openPlanner);
    $('stepBackBtn')?.addEventListener('click', () => goToPlanStep(currentStepIndex - 1));
    $('stepNextBtn')?.addEventListener('click', advancePlan);
    $('sideNextBtn')?.addEventListener('click', advancePlan);
    $('exportDataBtn')?.addEventListener('click', exportPlanData);
    $('importDataBtn')?.addEventListener('click', () => $('importFile')?.click());
    $('importFile')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0]; if (file) importPlanData(file); event.target.value = '';
    });
    $('financialForm')?.addEventListener('submit', (event) => event.preventDefault());
    $('financialForm')?.addEventListener('reset', (event) => { event.preventDefault(); resetPlan(); });
    document.querySelectorAll('[data-go-step]').forEach((button) => button.addEventListener('click', () => goToPlanStep(button.dataset.goStep)));
    renderPlanExperience();
  }

  document.addEventListener('DOMContentLoaded', modernInit);

  window.FinancialCalculator = {
    formatCurrency,
    parseNumber,
    parseExpressionNumber,
    calculatePercentage,
    roundToTwo,
    defaultFinanceData,
    normalizeFinanceData,
    validateImportedData,
    readFormData,
    writeFormData,
    calculateFinancialDiagnosis,
    calculateDebtSimulation,
    calculateSavingsProjections,
    calculateSavingsScenarios,
    generateRecommendations,
    buildEditableExport,
    buildDiagnosisSummary
  };
})();
