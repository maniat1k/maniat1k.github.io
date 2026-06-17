import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("js/postgres-syntax-validator.js", "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const validate = context.window.validatePostgresSqlSyntax;
assert.equal(typeof validate, "function", "validatePostgresSqlSyntax should be exposed");

const cases = [
  {
    name: "valid SELECT with WHERE",
    sql: "SELECT id, name FROM users WHERE active = true;",
    valid: true,
    status: "ok",
    statementType: "SELECT"
  },
  {
    name: "invalid SELECT missing projection",
    sql: "SELECT FROM WHERE;",
    valid: false,
    status: "error",
    includes: "Expresión SQL inválida"
  },
  {
    name: "valid INSERT with one column",
    sql: "INSERT INTO test_users (name) VALUES ('Marcelo');",
    valid: true,
    status: "ok",
    statementType: "INSERT"
  },
  {
    name: "invalid INSERT without INTO",
    sql: "INSERT test_users (name) VALUES ('Marcelo');",
    valid: false,
    status: "error",
    includes: "INTO"
  },
  {
    name: "invalid INSERT without VALUES",
    sql: "INSERT INTO test_users (name);",
    valid: false,
    status: "error",
    includes: "INSERT incompleto"
  },
  {
    name: "invalid INSERT with empty VALUES",
    sql: "INSERT INTO test_users (name) VALUES ();",
    valid: false,
    status: "error",
    includes: "VALUES no puede estar vacío"
  },
  {
    name: "invalid INSERT column value mismatch",
    sql: "INSERT INTO test_users (name, active) VALUES ('Marcelo');",
    valid: false,
    status: "error",
    includes: "no coincide"
  },
  {
    name: "invalid INSERT unclosed string",
    sql: "INSERT INTO test_users (name) VALUES ('Marcelo);",
    valid: false,
    status: "error",
    includes: "comillas sin cerrar"
  },
  {
    name: "invalid INSERT incomplete parenthesis",
    sql: "INSERT INTO test_users (name VALUES ('Marcelo');",
    valid: false,
    status: "error",
    includes: ")"
  },
  {
    name: "valid CREATE TABLE with common constraints",
    sql: `CREATE TABLE test_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);`,
    valid: true,
    status: "ok",
    statementType: "CREATE"
  },
  {
    name: "invalid CREATE TABLE column without type",
    sql: "CREATE TABLE test_users (id, name TEXT);",
    valid: false,
    status: "error",
    includes: "Columna sin tipo"
  },
  {
    name: "invalid CREATE TABLE missing parentheses",
    sql: "CREATE TABLE users id SERIAL PRIMARY KEY;",
    valid: false,
    status: "error",
    includes: "símbolo ("
  },
  {
    name: "invalid CREATE TABLE trailing comma",
    sql: "CREATE TABLE test_users (id SERIAL,);",
    valid: false,
    status: "error",
    includes: "Coma sobrante"
  },
  {
    name: "invalid CREATE TABLE missing comma",
    sql: "CREATE TABLE test_users (id SERIAL name TEXT);",
    valid: false,
    status: "error",
    includes: "coma"
  },
  {
    name: "ambiguous mixed SELECT commands returns warning",
    sql: "SELECT 1 SELECT 2;",
    valid: true,
    status: "warning",
    warningIncludes: "mezcla de comandos"
  }
];

for (const testCase of cases) {
  const result = validate(testCase.sql);
  assert.equal(result.valid, testCase.valid, `${testCase.name}: valid`);
  assert.equal(result.status, testCase.status, `${testCase.name}: status`);
  assert.ok(result.stats, `${testCase.name}: stats should exist`);
  assert.equal(typeof result.stats.lines, "number", `${testCase.name}: line count`);
  assert.equal(typeof result.stats.commands, "number", `${testCase.name}: command count`);
  assert.equal(typeof result.stats.complexity, "string", `${testCase.name}: complexity`);
  if (testCase.statementType) {
    assert.equal(result.stats.statementType, testCase.statementType, `${testCase.name}: statement type`);
  }
  if (testCase.includes) {
    assert.ok(result.message.includes(testCase.includes) || result.errors.some((item) => item.includes(testCase.includes)), `${testCase.name}: expected message to include ${testCase.includes}`);
  }
  if (testCase.warningIncludes) {
    assert.ok(result.warnings.some((item) => item.includes(testCase.warningIncludes)), `${testCase.name}: expected warning`);
  }
}

console.log(`PostgreSQL validator tests OK (${cases.length} cases)`);
