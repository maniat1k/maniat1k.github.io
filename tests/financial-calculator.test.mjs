import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/financial-calculator.js', import.meta.url), 'utf8');

const context = {
  console,
  window: {},
  document: {
    addEventListener() {},
    getElementById() {
      return null;
    },
    createElement() {
      return {
        click() {}
      };
    }
  },
  Blob: class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  },
  URL: {
    createObjectURL() {
      return 'blob:test';
    },
    revokeObjectURL() {}
  },
  navigator: {
    clipboard: {
      writeText() {
        return Promise.resolve();
      }
    }
  },
  setTimeout
};

vm.createContext(context);
vm.runInContext(source, context);

const finance = context.window.FinancialCalculator;

function makeData(overrides = {}) {
  return finance.normalizeFinanceData({
    incomes: { sueldo: 100000, extra: 10000, otros: 0 },
    expenses: {
      fixed: {
        vivienda: 25000,
        servicios: 7000,
        alimentacion: 18000,
        transporte: 6000,
        salud: 3000,
        educacion: 0,
        familia: 0,
        otros: 4000
      },
      variable: {
        ocio: 8000,
        alimentacion: 0,
        otros: 5000
      }
    },
    debts: {
      total: 0,
      minimumMonthly: 0,
      loanMonthly: 0,
      extraMonthly: 0
    },
    goals: [{ name: 'Fondo inicial', amount: 50000 }],
    emergencyFund: { current: 70000 },
    ...overrides
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('calcula un diagnostico positivo desde datos manuales', () => {
  const diagnosis = finance.calculateFinancialDiagnosis(makeData());
  assert.equal(diagnosis.totalIncome, 110000);
  assert.equal(diagnosis.totalExpenses, 76000);
  assert.equal(diagnosis.monthlyBalance, 34000);
  assert.equal(diagnosis.debtSimulation.active, false);
  assert.ok(diagnosis.scenarios.length >= 3);
});

test('interpreta operaciones monetarias simples sin eval', () => {
  assert.equal(finance.parseExpressionNumber('1500+3000+2800').value, 7300);
  assert.equal(finance.parseExpressionNumber('20000-1500').value, 18500);
  assert.equal(finance.parseExpressionNumber('1.500,50+2.000,25').value, 3500.75);
  assert.equal(finance.parseExpressionNumber('1,500.50+2,000.25').value, 3500.75);
});

test('marca expresiones invalidas con mensaje amigable', () => {
  const invalid = finance.parseExpressionNumber('1500++300');
  assert.equal(invalid.valid, false);
  assert.match(invalid.error, /operaci[oó]n|incompleta|número/);
});

test('calcula estado del velocimetro financiero', () => {
  const healthy = finance.calculateFinancialDiagnosis(makeData({
    expenses: {
      fixed: { vivienda: 20000, servicios: 5000, alimentacion: 12000, transporte: 4000 },
      variable: { ocio: 8000, otros: 5000 }
    }
  }));
  assert.equal(healthy.gauge.zone, 'success');

  const risky = finance.calculateFinancialDiagnosis(makeData({
    incomes: { sueldo: 50000, extra: 0, otros: 0 },
    expenses: {
      fixed: { vivienda: 45000, servicios: 10000 },
      variable: { ocio: 2000 }
    }
  }));
  assert.equal(risky.gauge.zone, 'danger');
  assert.match(risky.gauge.message, /gastando más/);
});

test('exporta datos editables con version y fecha', () => {
  const exported = finance.buildEditableExport(makeData());
  assert.equal(exported.schemaVersion, '2.0.0');
  assert.ok(exported.exportedAt);
  assert.equal(exported.incomes.sueldo, 100000);
  assert.equal(exported.expenses.fixed.vivienda, 25000);
});

test('importa una exportacion completa sin perder estructura', () => {
  const exported = finance.buildEditableExport(makeData());
  const imported = finance.validateImportedData(exported);
  assert.equal(imported.incomes.extra, 10000);
  assert.equal(imported.goals[0].name, 'Fondo inicial');
});

test('importa archivos con campos faltantes usando valores por defecto', () => {
  const imported = finance.validateImportedData({ incomes: { sueldo: 45000 } });
  assert.equal(imported.incomes.sueldo, 45000);
  assert.equal(imported.expenses.fixed.vivienda, 0);
  assert.equal(imported.debts.total, 0);
});

test('rechaza archivos incompatibles con mensaje claro', () => {
  assert.throws(
    () => finance.validateImportedData({ foo: true }),
    /exportaci[oó]n financiera compatible/
  );
});

test('detecta deuda alta y reduce meses con pago extra', () => {
  const diagnosis = finance.calculateFinancialDiagnosis(makeData({
    debts: { total: 120000, minimumMonthly: 10000, loanMonthly: 0, extraMonthly: 10000 }
  }));
  assert.equal(diagnosis.debtSimulation.active, true);
  assert.equal(diagnosis.debtSimulation.monthsMinimum, 12);
  assert.equal(diagnosis.debtSimulation.monthsWithExtra, 6);
  assert.equal(diagnosis.investmentAllowed, false);
});

test('permite distinguir escenario sin deuda', () => {
  const diagnosis = finance.calculateFinancialDiagnosis(makeData({
    emergencyFund: { current: 80000 }
  }));
  assert.equal(diagnosis.debtSimulation.active, false);
  assert.equal(diagnosis.investmentAllowed, true);
});

test('marca saldo negativo como situacion de riesgo', () => {
  const diagnosis = finance.calculateFinancialDiagnosis(makeData({
    incomes: { sueldo: 50000, extra: 0, otros: 0 },
    expenses: {
      fixed: { vivienda: 40000, servicios: 10000, alimentacion: 12000 },
      variable: { ocio: 5000 }
    }
  }));
  assert.ok(diagnosis.monthlyBalance < 0);
  assert.equal(diagnosis.status.status, 'at-risk');
  assert.equal(diagnosis.investmentAllowed, false);
});

test('resume diagnostico con escenarios y recomendacion', () => {
  const diagnosis = finance.calculateFinancialDiagnosis(makeData());
  const summary = finance.buildDiagnosisSummary(diagnosis);
  assert.match(summary, /Diagnostico financiero personal|Diagnóstico financiero personal/);
  assert.match(summary, /Escenarios:/);
  assert.match(summary, /Recomendacion principal|Recomendación principal/);
});
