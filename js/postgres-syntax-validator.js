// PostgreSQL syntax validation helper for the SQL validator section.
// No external parser library is required: this file implements a lightweight tokenizer
// and recursive parser to validate PostgreSQL SQL syntax and balanced structures.

(function () {
  'use strict';

  const KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'SCHEMA', 'DATABASE', 'FUNCTION',
    'PROCEDURE', 'TRIGGER', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE',
    'WITH', 'RECURSIVE', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'NATURAL', 'USING',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'IS', 'NULL', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ILIKE',
    'AND', 'OR', 'ANY', 'SOME', 'ALL', 'EXISTS', 'DISTINCT', 'ON', 'TRUE', 'FALSE', 'UNKNOWN', 'DEFAULT', 'PRIMARY',
    'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'OWNER', 'COMMENT', 'IF', 'EXISTS', 'ONLY',
    'OVER', 'PARTITION', 'RANGE', 'ROWS', 'GROUPS', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW', 'WHEN', 'THEN', 'ELSE',
    'ASC', 'DESC', 'FIRST', 'NEXT', 'REPLACE', 'TEMP', 'TEMPORARY', 'UNLOGGED', 'CONCURRENTLY', 'RETURNING',
    'CONFLICT', 'DO', 'NOTHING', 'EXCLUDED', 'ARRAY', 'INTERVAL', 'FILTER', 'LATERAL', 'VALUES'
  ]);

  class ParseError extends Error {
    constructor(message, position) {
      super(message);
      this.name = 'ParseError';
      this.position = position || 0;
    }
  }

  class Tokenizer {
    constructor(input) {
      this.input = input;
      this.length = input.length;
      this.position = 0;
      this.tokens = [];
    }

    tokenize() {
      while (!this._eof()) {
        const char = this._peek();

        if (this._isWhitespace(char)) {
          this._advance();
          continue;
        }

        if (char === '-' && this._peek(1) === '-') {
          this._consumeLineComment();
          continue;
        }

        if (char === '/' && this._peek(1) === '*') {
          this._consumeBlockComment();
          continue;
        }

        if (char === "'" || char === '"') {
          this.tokens.push(this._readWithProgress(() => this._readQuoted(char)));
          continue;
        }

        if (char === '$') {
          this.tokens.push(this._readWithProgress(() => this._readDollarToken()));
          continue;
        }

        if (this._isIdentifierStart(char)) {
          this.tokens.push(this._readWithProgress(() => this._readIdentifierOrKeyword()));
          continue;
        }

        if (this._isDigit(char) || (char === '.' && this._isDigit(this._peek(1)))) {
          this.tokens.push(this._readWithProgress(() => this._readNumber()));
          continue;
        }

        const operator = this._readOperator();
        if (operator) {
          this.tokens.push(operator);
          continue;
        }

        if (['=', '<', '>', '+', '-', '*', '/', '%', ',', ';', '(', ')', '.', ':', '[', ']'].includes(char)) {
          this.tokens.push({ type: 'symbol', value: char });
          this._advance();
          continue;
        }

        this.tokens.push({ type: 'symbol', value: char });
        this._advance();
      }

      return this.tokens;
    }

    _readWithProgress(reader) {
      const startPosition = this.position;
      const token = reader();
      if (this.position === startPosition) {
        throw new ParseError(`Token SQL inesperado cerca de "${this._peek()}"`, this.position);
      }
      return token;
    }

    _eof() {
      return this.position >= this.length;
    }

    _peek(offset = 0, length = 1) {
      return this.input.substr(this.position + offset, length);
    }

    _advance() {
      this.position += 1;
    }

    _isWhitespace(char) {
      return char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f' || char === '\v';
    }

    _consumeLineComment() {
      while (!this._eof() && this._peek() !== '\n') {
        this._advance();
      }
    }

    _consumeBlockComment() {
      this._advance();
      this._advance();
      while (!this._eof()) {
        if (this._peek() === '*' && this._peek(1) === '/') {
          this._advance();
          this._advance();
          return;
        }
        this._advance();
      }
      throw new ParseError('Comentario de bloque sin cerrar', this.position);
    }

    _readQuoted(quoteChar) {
      let value = quoteChar;
      this._advance();
      while (!this._eof()) {
        const char = this._peek();
        value += char;
        this._advance();
        if (char === quoteChar) {
          if (this._peek() === quoteChar) {
            value += quoteChar;
            this._advance();
            continue;
          }
          break;
        }
      }

      if (value[value.length - 1] !== quoteChar) {
        throw new ParseError('Cadena o identificador entre comillas sin cerrar', this.position);
      }

      return {
        type: quoteChar === '"' ? 'quotedIdentifier' : 'string',
        value
      };
    }

    _readIdentifierOrKeyword() {
      let value = '';
      while (!this._eof()) {
        const char = this._peek();
        if (!this._isIdentifierPart(char) && char !== '.') break;
        value += char;
        this._advance();
      }

      const upperValue = value.toUpperCase();
      return {
        type: KEYWORDS.has(upperValue) ? 'keyword' : 'identifier',
        value: upperValue
      };
    }

    _readDollarToken() {
      const parameter = this.input.slice(this.position).match(/^\$[0-9]+/);
      if (parameter) {
        this.position += parameter[0].length;
        return { type: 'parameter', value: parameter[0] };
      }

      const delimiter = this.input.slice(this.position).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (delimiter) {
        const tag = delimiter[0];
        const start = this.position;
        this.position += tag.length;
        const end = this.input.indexOf(tag, this.position);
        if (end === -1) {
          throw new ParseError('Cadena dollar-quoted sin cerrar', this.position);
        }
        this.position = end + tag.length;
        return { type: 'string', value: this.input.slice(start, this.position) };
      }

      this._advance();
      return { type: 'symbol', value: '$' };
    }

    _readOperator() {
      const operators = ['#>>', '->>', '<=', '>=', '<>', '!=', '||', '::', '->', '@>', '<@', '?|', '?&', '#>', '@?', '@@', '?'];
      for (const operator of operators) {
        if (this._peek(0, operator.length) === operator) {
          this.position += operator.length;
          return { type: 'operator', value: operator };
        }
      }
      return null;
    }

    _readNumber() {
      let value = '';
      let hasDot = false;
      while (!this._eof()) {
        const char = this._peek();
        if (char === '.') {
          if (hasDot) break;
          hasDot = true;
          value += char;
          this._advance();
          continue;
        }
        if (!this._isDigit(char) && char !== 'e' && char !== 'E' && char !== '+' && char !== '-') break;
        value += char;
        this._advance();
      }
      return { type: 'number', value };
    }

    _isIdentifierStart(char) {
      return /[A-Za-z_]/.test(char);
    }

    _isIdentifierPart(char) {
      return /[A-Za-z0-9_]/.test(char);
    }

    _isDigit(char) {
      return /[0-9]/.test(char);
    }
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.position = 0;
    }

    parseStatements() {
      while (!this._isAtEnd()) {
        this._consumeEmptyStatements();
        if (this._isAtEnd()) break;
        this._parseStatement();
        if (this._matchSymbol(';')) {
          this._advance();
          continue;
        }
        if (!this._isAtEnd()) {
          throw new ParseError('Se requiere punto y coma al final de cada statement', this._position());
        }
      }
    }

    _consumeEmptyStatements() {
      while (this._matchSymbol(';')) {
        this._advance();
      }
    }

    _parseStatement() {
      if (this._matchKeyword('WITH')) {
        return this._parseWithStatement();
      }

      if (this._matchKeyword('SELECT')) {
        return this._parseSelectStatement();
      }

      if (this._matchKeyword('INSERT')) {
        return this._parseInsertStatement();
      }

      if (this._matchKeyword('UPDATE')) {
        return this._parseUpdateStatement();
      }

      if (this._matchKeyword('DELETE')) {
        return this._parseDeleteStatement();
      }

      if (this._matchKeyword('CREATE')) {
        return this._parseCreateStatement();
      }

      if (this._matchKeyword('ALTER')) {
        return this._parseAlterStatement();
      }

      if (this._matchKeyword('DROP')) {
        return this._parseDropStatement();
      }

      if (this._matchKeyword('TRUNCATE')) {
        return this._parseTruncateStatement();
      }

      if (this._matchKeyword('GRANT') || this._matchKeyword('REVOKE')) {
        return this._parseGrantRevokeStatement();
      }

      if (this._matchKeyword('BEGIN') || this._matchKeyword('COMMIT') || this._matchKeyword('ROLLBACK') || this._matchKeyword('SAVEPOINT') || this._matchKeyword('RELEASE')) {
        return this._parseSimpleTransactionStatement();
      }

      if (this._matchKeyword('SET')) {
        return this._parseSetStatement();
      }

      return this._parseGenericStatement();
    }

    _parseWithStatement() {
      this._expectKeyword('WITH');
      if (this._matchKeyword('RECURSIVE')) {
        this._advance();
      }
      this._parseCteDefinition();
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseCteDefinition();
      }
      this._parseStatement();
    }

    _parseCteDefinition() {
      this._parseIdentifier();
      if (this._matchSymbol('(')) {
        this._advance();
        this._parseIdentifier();
        while (this._matchSymbol(',')) {
          this._advance();
          this._parseIdentifier();
        }
        this._expectSymbol(')');
      }
      this._expectKeyword('AS');
      this._expectSymbol('(');
      this._parseStatement();
      this._expectSymbol(')');
    }

    _parseSelectStatement() {
      this._expectKeyword('SELECT');
      if (this._matchKeyword('DISTINCT') || this._matchKeyword('ALL')) {
        this._advance();
      }

      this._parseExpressionList();
      this._parseSelectClauses();
    }

    _parseSelectClauses() {
      while (true) {
        if (this._matchKeyword('FROM')) {
          this._advance();
          this._parseFromClause();
          continue;
        }

        if (this._matchKeyword('WHERE')) {
          this._advance();
          this._parseExpression();
          continue;
        }

        if (this._matchKeyword('GROUP')) {
          this._advance();
          this._expectKeyword('BY');
          this._parseExpressionList();
          continue;
        }

        if (this._matchKeyword('HAVING')) {
          this._advance();
          this._parseExpression();
          continue;
        }

        if (this._matchKeyword('WINDOW')) {
          this._advance();
          this._parseWindowDefinitions();
          continue;
        }

        if (this._matchKeyword('ORDER')) {
          this._advance();
          this._expectKeyword('BY');
          this._parseOrderExpressions();
          continue;
        }

        if (this._matchKeyword('LIMIT') || this._matchKeyword('OFFSET') || this._matchKeyword('FETCH')) {
          this._parseSimpleExpressionClause();
          continue;
        }

        if (this._matchKeyword('UNION') || this._matchKeyword('INTERSECT') || this._matchKeyword('EXCEPT')) {
          this._advance();
          if (this._matchKeyword('ALL') || this._matchKeyword('DISTINCT')) {
            this._advance();
          }
          this._parseSelectStatement();
          continue;
        }

        break;
      }
    }

    _parseFromClause() {
      this._parseTableReference();
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseTableReference();
      }
    }

    _parseTableReference() {
      if (this._matchSymbol('(')) {
        this._advance();
        this._parseStatement();
        this._expectSymbol(')');
        this._parseOptionalAlias();
        return;
      }
      this._parseIdentifier();
      while (this._matchSymbol('.')) {
        this._advance();
        this._parseIdentifier();
      }
      this._parseOptionalAlias();
      if (this._matchKeyword('AS')) {
        this._advance();
        this._parseIdentifier();
      }
      if (this._matchIdentifier()) {
        this._advance();
      }
      if (this._matchKeyword('JOIN') || this._matchKeyword('INNER') || this._matchKeyword('LEFT') || this._matchKeyword('RIGHT') || this._matchKeyword('FULL') || this._matchKeyword('CROSS') || this._matchKeyword('NATURAL')) {
        this._parseJoinExpression();
      }
    }

    _parseQualifiedName() {
      this._parseIdentifier();
      while (this._matchSymbol('.')) {
        this._advance();
        this._parseIdentifier();
      }
    }

    _parseOptionalAlias() {
      if (this._matchKeyword('AS')) {
        this._advance();
        this._parseIdentifier();
      }
    }

    _parseJoinExpression() {
      if (this._matchKeyword('NATURAL')) {
        this._advance();
      }
      if (this._matchKeyword('INNER') || this._matchKeyword('LEFT') || this._matchKeyword('RIGHT') || this._matchKeyword('FULL') || this._matchKeyword('CROSS')) {
        this._advance();
      }
      this._expectKeyword('JOIN');
      this._parseTableReference();
      if (this._matchKeyword('USING')) {
        this._advance();
        this._expectSymbol('(');
        this._parseIdentifier();
        while (this._matchSymbol(',')) {
          this._advance();
          this._parseIdentifier();
        }
        this._expectSymbol(')');
      }
      if (this._matchKeyword('ON')) {
        this._advance();
        this._parseExpression();
      }
    }

    _parseWindowDefinitions() {
      this._parseIdentifier();
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseIdentifier();
      }
    }

    _parseOrderExpressions() {
      this._parseExpression();
      if (this._matchKeyword('ASC') || this._matchKeyword('DESC')) {
        this._advance();
      }
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseExpression();
        if (this._matchKeyword('ASC') || this._matchKeyword('DESC')) {
          this._advance();
        }
      }
    }

    _parseSimpleExpressionClause() {
      if (this._matchKeyword('LIMIT') || this._matchKeyword('OFFSET')) {
        this._advance();
        this._parseExpression();
        return;
      }
      if (this._matchKeyword('FETCH')) {
        this._advance();
        if (this._matchKeyword('FIRST') || this._matchKeyword('NEXT')) {
          this._advance();
        }
        this._parseExpression();
        this._expectKeyword('ROWS');
        if (this._matchKeyword('ONLY')) {
          this._advance();
        }
      }
    }

    _parseInsertStatement() {
      this._expectKeyword('INSERT');
      this._expectKeyword('INTO');
      this._parseQualifiedName();
      let columnCount = null;
      if (this._matchSymbol('(')) {
        columnCount = this._parseIdentifierListInParentheses('La lista de columnas del INSERT no puede estar vacía');
      }
      if (this._matchKeyword('VALUES')) {
        this._advance();
        const valueCounts = this._parseValueGroups();
        if (columnCount !== null) {
          valueCounts.forEach((count) => {
            if (count !== columnCount) {
              throw new ParseError(`Cantidad de valores (${count}) no coincide con columnas (${columnCount})`, this._position());
            }
          });
        }
      } else if (this._matchKeyword('DEFAULT')) {
        this._advance();
        this._expectKeyword('VALUES');
      } else if (this._matchKeyword('SELECT') || this._matchKeyword('WITH')) {
        this._parseStatement();
      } else {
        throw new ParseError('INSERT incompleto: se esperaba VALUES, DEFAULT VALUES o SELECT', this._position());
      }
      if (this._matchKeyword('ON')) {
        this._advance();
        this._expectKeyword('CONFLICT');
        while (!this._isAtEnd() && !this._matchSymbol(';') && !this._matchKeyword('RETURNING')) {
          this._advance();
        }
      }
      if (this._matchKeyword('RETURNING')) {
        this._advance();
        this._parseExpressionList();
      }
    }

    _parseValueGroups() {
      const counts = [];
      this._expectSymbol('(');
      counts.push(this._parseCommaSeparatedExpressionsUntil(')', 'VALUES no puede estar vacío'));
      this._expectSymbol(')');
      while (this._matchSymbol(',')) {
        this._advance();
        this._expectSymbol('(');
        counts.push(this._parseCommaSeparatedExpressionsUntil(')', 'VALUES no puede estar vacío'));
        this._expectSymbol(')');
      }
      return counts;
    }

    _parseUpdateStatement() {
      this._expectKeyword('UPDATE');
      this._parseTableReference();
      this._expectKeyword('SET');
      this._parseAssignment();
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseAssignment();
      }
      if (this._matchKeyword('WHERE')) {
        this._advance();
        this._parseExpression();
      }
    }

    _parseDeleteStatement() {
      this._expectKeyword('DELETE');
      if (this._matchKeyword('FROM')) {
        this._advance();
      }
      this._parseTableReference();
      if (this._matchKeyword('WHERE')) {
        this._advance();
        this._parseExpression();
      }
    }

    _parseCreateStatement() {
      this._expectKeyword('CREATE');
      if (this._matchKeyword('OR')) {
        this._advance();
        this._expectKeyword('REPLACE');
      }
      while (this._matchKeyword('TEMP') || this._matchKeyword('TEMPORARY') || this._matchKeyword('UNLOGGED')) {
        this._advance();
      }
      if (this._matchKeyword('TABLE')) {
        this._advance();
        this._parseCreateTableStatement();
        return;
      }
      if (this._matchKeyword('TABLE') || this._matchKeyword('VIEW') || this._matchKeyword('INDEX') || this._matchKeyword('SCHEMA') || this._matchKeyword('DATABASE') || this._matchKeyword('FUNCTION') || this._matchKeyword('PROCEDURE') || this._matchKeyword('TYPE')) {
        this._advance();
      }
      if (!this._matchSymbol('(') && !this._matchKeyword('AS')) {
        this._parseTableReference();
      }
      if (this._matchSymbol('(')) {
        this._advance();
        while (!this._matchSymbol(')') && !this._isAtEnd()) {
          this._parseIdentifier();
          if (this._matchKeyword('PRIMARY') || this._matchKeyword('UNIQUE') || this._matchKeyword('REFERENCES') || this._matchKeyword('CHECK') || this._matchKeyword('NOT') || this._matchKeyword('DEFAULT') || this._matchKeyword('CONSTRAINT')) {
            this._advance();
          }
          if (this._matchSymbol(',')) {
            this._advance();
            continue;
          }
        }
        this._expectSymbol(')');
      }
      if (this._matchKeyword('AS')) {
        this._advance();
        if (this._matchKeyword('SELECT') || this._matchKeyword('WITH')) {
          this._parseStatement();
        }
      }
    }

    _parseCreateTableStatement() {
      if (this._matchKeyword('IF')) {
        this._advance();
        this._expectKeyword('NOT');
        this._expectKeyword('EXISTS');
      }

      this._parseQualifiedName();

      if (this._matchKeyword('AS')) {
        this._advance();
        if (this._matchKeyword('SELECT') || this._matchKeyword('WITH')) {
          this._parseStatement();
          return;
        }
        throw new ParseError('CREATE TABLE AS requiere SELECT o WITH', this._position());
      }

      this._expectSymbol('(');
      if (this._matchSymbol(')')) {
        throw new ParseError('CREATE TABLE requiere al menos una columna o constraint', this._position());
      }

      while (!this._isAtEnd()) {
        if (this._matchSymbol(',')) {
          throw new ParseError('Coma sobrante o definición vacía en CREATE TABLE', this._position());
        }

        this._parseTableElement();

        if (this._matchSymbol(',')) {
          this._advance();
          if (this._matchSymbol(')')) {
            throw new ParseError('Coma sobrante antes de cerrar CREATE TABLE', this._position());
          }
          continue;
        }

        if (this._matchSymbol(')')) {
          this._advance();
          return;
        }

        throw new ParseError('Se esperaba coma entre definiciones de CREATE TABLE', this._position());
      }

      throw new ParseError('Se esperaba el símbolo )', this._position());
    }

    _parseTableElement() {
      if (this._matchKeyword('CONSTRAINT')) {
        this._advance();
        this._parseIdentifier();
        this._parseTableConstraint();
        return;
      }

      if (this._matchKeyword('PRIMARY') || this._matchKeyword('UNIQUE') || this._matchKeyword('CHECK') || this._matchKeyword('FOREIGN')) {
        this._parseTableConstraint();
        return;
      }

      this._parseIdentifier();

      if (this._isColumnConstraintStart(this.tokens[this.position]) || this._matchSymbol(',') || this._matchSymbol(')')) {
        throw new ParseError('Columna sin tipo de dato en CREATE TABLE', this._position());
      }

      this._parseColumnType();

      while (!this._isAtEnd() && !this._matchSymbol(',') && !this._matchSymbol(')')) {
        if (this._isColumnConstraintStart(this.tokens[this.position])) {
          this._parseColumnConstraint();
          continue;
        }
        if (this._matchIdentifier()) {
          throw new ParseError('Se esperaba coma entre definiciones de CREATE TABLE', this._position());
        }
        throw new ParseError('Token inesperado en definición de columna CREATE TABLE', this._position());
      }
    }

    _parseColumnType() {
      if (!(this._matchType('identifier') || this._matchType('quotedIdentifier') || this._matchType('keyword'))) {
        throw new ParseError('Tipo de dato esperado en CREATE TABLE', this._position());
      }
      this._advance();

      const allowedTypeTail = new Set(['PRECISION', 'VARYING', 'WITH', 'WITHOUT', 'TIME', 'ZONE']);
      while (!this._isAtEnd()) {
        const token = this.tokens[this.position];
        if (!(token.type === 'identifier' || token.type === 'keyword') || !allowedTypeTail.has(token.value)) break;
        this._advance();
      }

      if (this._matchSymbol('(')) {
        this._advance();
        this._parseBalancedParentheses();
      }
      if (this._matchSymbol('[')) {
        this._advance();
        this._expectSymbol(']');
      }
    }

    _parseColumnConstraint() {
      if (this._matchKeyword('CONSTRAINT')) {
        this._advance();
        this._parseIdentifier();
      }
      if (this._matchKeyword('PRIMARY')) {
        this._advance();
        this._expectKeyword('KEY');
        return;
      }
      if (this._matchKeyword('NOT')) {
        this._advance();
        this._expectKeyword('NULL');
        return;
      }
      if (this._matchKeyword('UNIQUE')) {
        this._advance();
        return;
      }
      if (this._matchKeyword('DEFAULT')) {
        this._advance();
        this._parseExpressionUntil({
          symbols: new Set([',', ')']),
          keywords: new Set(['CONSTRAINT', 'PRIMARY', 'NOT', 'UNIQUE', 'CHECK', 'REFERENCES'])
        });
        return;
      }
      if (this._matchKeyword('CHECK')) {
        this._advance();
        this._expectSymbol('(');
        this._parseBalancedParentheses();
        return;
      }
      if (this._matchKeyword('REFERENCES')) {
        this._advance();
        this._parseTableReference();
        if (this._matchSymbol('(')) {
          this._parseIdentifierListInParentheses('La lista REFERENCES no puede estar vacía');
        }
        return;
      }
      throw new ParseError('Constraint de columna no reconocida', this._position());
    }

    _parseTableConstraint() {
      if (this._matchKeyword('PRIMARY')) {
        this._advance();
        this._expectKeyword('KEY');
        this._parseIdentifierListInParentheses('PRIMARY KEY requiere columnas');
        return;
      }
      if (this._matchKeyword('UNIQUE')) {
        this._advance();
        this._parseIdentifierListInParentheses('UNIQUE requiere columnas');
        return;
      }
      if (this._matchKeyword('CHECK')) {
        this._advance();
        this._expectSymbol('(');
        this._parseBalancedParentheses();
        return;
      }
      if (this._matchKeyword('FOREIGN')) {
        this._advance();
        this._expectKeyword('KEY');
        this._parseIdentifierListInParentheses('FOREIGN KEY requiere columnas');
        this._expectKeyword('REFERENCES');
        this._parseTableReference();
        if (this._matchSymbol('(')) {
          this._parseIdentifierListInParentheses('REFERENCES requiere columnas');
        }
        return;
      }
      throw new ParseError('Constraint de tabla no reconocida', this._position());
    }

    _isColumnConstraintStart(token) {
      return token && token.type === 'keyword' && ['CONSTRAINT', 'PRIMARY', 'NOT', 'UNIQUE', 'DEFAULT', 'CHECK', 'REFERENCES'].includes(token.value);
    }

    _parseAlterStatement() {
      this._expectKeyword('ALTER');
      if (this._matchKeyword('TABLE') || this._matchKeyword('VIEW') || this._matchKeyword('INDEX') || this._matchKeyword('SCHEMA') || this._matchKeyword('DATABASE')) {
        this._advance();
      }
      this._parseTableReference();
      while (!this._matchSymbol(';') && !this._isAtEnd()) {
        if (this._matchKeyword('ADD') || this._matchKeyword('DROP') || this._matchKeyword('RENAME') || this._matchKeyword('ALTER') || this._matchKeyword('SET') || this._matchKeyword('OWNER')) {
          this._advance();
        } else {
          this._advance();
        }
      }
    }

    _parseDropStatement() {
      this._expectKeyword('DROP');
      if (this._matchKeyword('TABLE') || this._matchKeyword('VIEW') || this._matchKeyword('INDEX') || this._matchKeyword('SCHEMA') || this._matchKeyword('DATABASE') || this._matchKeyword('FUNCTION') || this._matchKeyword('PROCEDURE')) {
        this._advance();
      }
      if (this._matchKeyword('IF')) {
        this._advance();
        this._expectKeyword('EXISTS');
      }
      this._parseTableReference();
      while (this._matchSymbol(',') || this._matchKeyword('CASCADE') || this._matchKeyword('RESTRICT')) {
        this._advance();
      }
    }

    _parseTruncateStatement() {
      this._expectKeyword('TRUNCATE');
      while (this._matchKeyword('TABLE') || this._matchKeyword('ONLY')) {
        this._advance();
      }
      this._parseTableReference();
    }

    _parseGrantRevokeStatement() {
      this._advance();
      while (!this._matchSymbol(';') && !this._isAtEnd()) {
        if (this._matchSymbol(',')) {
          this._advance();
          continue;
        }
        this._advance();
      }
    }

    _parseSimpleTransactionStatement() {
      this._advance();
      if (this._matchKeyword('TRANSACTION')) {
        this._advance();
      }
      if (this._matchKeyword('WORK')) {
        this._advance();
      }
    }

    _parseSetStatement() {
      this._expectKeyword('SET');
      this._parseIdentifier();
      if (this._matchSymbol('=')) {
        this._advance();
        this._parseExpression();
      }
    }

    _parseGenericStatement() {
      if (!this._isAtEnd()) {
        this._advance();
      }
      while (!this._isAtEnd() && !this._matchSymbol(';')) {
        if (this._matchSymbol('(')) {
          this._advance();
          this._parseBalancedParentheses();
          continue;
        }
        this._advance();
      }
    }

    _parseBalancedParentheses() {
      while (!this._isAtEnd() && !this._matchSymbol(')')) {
        if (this._matchSymbol('(')) {
          this._advance();
          this._parseBalancedParentheses();
          continue;
        }
        if (this._matchKeyword('SELECT') || this._matchKeyword('WITH')) {
          this._parseStatement();
          continue;
        }
        this._advance();
      }
      this._expectSymbol(')');
    }

    _parseExpressionList() {
      this._parseExpression();
      while (this._matchSymbol(',')) {
        this._advance();
        this._parseExpression();
      }
    }

    _parseIdentifierListInParentheses(emptyMessage) {
      let count = 0;
      this._expectSymbol('(');
      if (this._matchSymbol(')')) {
        throw new ParseError(emptyMessage || 'Lista vacía no permitida', this._position());
      }
      this._parseIdentifier();
      count += 1;
      while (this._matchSymbol(',')) {
        this._advance();
        if (this._matchSymbol(')')) {
          throw new ParseError('Coma sobrante en lista de identificadores', this._position());
        }
        this._parseIdentifier();
        count += 1;
      }
      this._expectSymbol(')');
      return count;
    }

    _parseCommaSeparatedExpressionsUntil(endSymbol, emptyMessage) {
      let count = 0;
      if (this._matchSymbol(endSymbol)) {
        throw new ParseError(emptyMessage || 'Lista de expresiones vacía', this._position());
      }
      this._parseExpressionUntil({
        symbols: new Set([',', endSymbol])
      });
      count += 1;
      while (this._matchSymbol(',')) {
        this._advance();
        if (this._matchSymbol(endSymbol)) {
          throw new ParseError('Coma sobrante en lista de valores', this._position());
        }
        this._parseExpressionUntil({
          symbols: new Set([',', endSymbol])
        });
        count += 1;
      }
      return count;
    }

    _parseExpression() {
      this._parseExpressionUntil({
        symbols: new Set([',', ';', ')']),
        keywords: new Set(['FROM', 'WHERE', 'GROUP', 'HAVING', 'WINDOW', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'UNION', 'INTERSECT', 'EXCEPT', 'RETURNING', 'USING'])
      });
    }

    _parseExpressionUntil(terminators) {
      let parenDepth = 0;
      let bracketDepth = 0;
      let consumed = 0;
      let previousWasOperator = true;
      let previousToken = null;

      while (!this._isAtEnd()) {
        const token = this.tokens[this.position];

        if (parenDepth === 0 && bracketDepth === 0 && this._isExpressionTerminator(token, terminators)) {
          break;
        }

        if (token.type === 'symbol' && token.value === '(') {
          parenDepth += 1;
          previousWasOperator = true;
          previousToken = token;
          this._advance();
          consumed += 1;
          continue;
        }

        if (token.type === 'symbol' && token.value === ')') {
          if (parenDepth === 0) break;
          parenDepth -= 1;
          previousWasOperator = false;
          previousToken = token;
          this._advance();
          consumed += 1;
          continue;
        }

        if (token.type === 'symbol' && token.value === '[') {
          bracketDepth += 1;
          previousWasOperator = true;
          previousToken = token;
          this._advance();
          consumed += 1;
          continue;
        }

        if (token.type === 'symbol' && token.value === ']') {
          if (bracketDepth === 0) {
            throw new ParseError('Corchete de cierre inesperado', this._position());
          }
          bracketDepth -= 1;
          previousWasOperator = false;
          previousToken = token;
          this._advance();
          consumed += 1;
          continue;
        }

        if (this._isExpressionOperator(token)) {
          if (this._isWildcardStar(token, previousToken, previousWasOperator, consumed)) {
            previousWasOperator = false;
            previousToken = token;
            this._advance();
            consumed += 1;
            continue;
          }
          if (previousWasOperator && !this._isUnaryExpressionOperator(token)) {
            throw new ParseError('Operador SQL inesperado', this._position());
          }
          previousWasOperator = !this._isPostfixExpressionOperator(token);
          previousToken = token;
          this._advance();
          consumed += 1;
          continue;
        }

        previousWasOperator = false;
        previousToken = token;
        this._advance();
        consumed += 1;
      }

      if (consumed === 0) {
        throw new ParseError('Expresión SQL inválida o inesperada', this._position());
      }

      if (parenDepth !== 0) {
        throw new ParseError('Se esperaba el símbolo )', this._position());
      }

      if (bracketDepth !== 0) {
        throw new ParseError('Se esperaba el símbolo ]', this._position());
      }

      if (previousWasOperator) {
        throw new ParseError('Expresión SQL incompleta después de operador', this._position());
      }
    }

    _isExpressionTerminator(token, terminators) {
      if (!token) return true;
      if (token.type === 'symbol' && terminators.symbols && terminators.symbols.has(token.value)) return true;
      if (token.type === 'keyword' && terminators.keywords && terminators.keywords.has(token.value)) return true;
      if (token.type === 'operator' && terminators.operators && terminators.operators.has(token.value)) return true;
      return false;
    }

    _isExpressionOperator(token) {
      return token && (
        token.type === 'operator' ||
        (token.type === 'symbol' && ['=', '<', '>', '+', '-', '*', '/', '%'].includes(token.value)) ||
        (token.type === 'keyword' && ['AND', 'OR', 'IN', 'IS', 'BETWEEN', 'LIKE', 'ILIKE', 'NOT'].includes(token.value))
      );
    }

    _isUnaryExpressionOperator(token) {
      return token && (
        (token.type === 'symbol' && ['+', '-'].includes(token.value)) ||
        (token.type === 'keyword' && ['NOT'].includes(token.value))
      );
    }

    _isWildcardStar(token, previousToken, previousWasOperator, consumed) {
      if (!token || token.type !== 'symbol' || token.value !== '*') return false;
      if (previousWasOperator && consumed === 0) return true;
      if (previousToken && previousToken.type === 'symbol' && previousToken.value === '(') return true;
      return previousToken && previousToken.type === 'identifier' && previousToken.value.endsWith('.');
    }

    _isPostfixExpressionOperator(token) {
      return false;
    }

    _parseAssignment() {
      this._parseExpressionUntil({
        symbols: new Set(['=', ';']),
        operators: new Set(['=']),
        keywords: new Set(['WHERE', 'FROM', 'RETURNING'])
      });
      this._expectSymbol('=');
      this._parseExpressionUntil({
        symbols: new Set([',', ';']),
        keywords: new Set(['WHERE', 'FROM', 'RETURNING'])
      });
    }

    _parseExpressionFragment() {
      if (this._matchSymbol('(')) {
        this._advance();
        this._parseExpression();
        this._expectSymbol(')');
        return;
      }
      if (this._matchKeyword('SELECT') || this._matchKeyword('WITH')) {
        this._parseStatement();
        return;
      }
      if (this._matchType('identifier') || this._matchType('quotedIdentifier')) {
        this._advance();
        while (this._matchSymbol('.')) {
          this._advance();
          if (this._matchSymbol('*')) {
            this._advance();
            break;
          }
          this._parseIdentifier();
        }
        if (this._matchSymbol('(')) {
          this._advance();
          if (!this._matchSymbol(')')) {
            this._parseExpressionList();
          }
          this._expectSymbol(')');
        }
        return;
      }
      if (this._matchSymbol('*')) {
        this._advance();
        return;
      }

      if (this._matchType('number') || this._matchType('string') || this._matchKeyword('TRUE') || this._matchKeyword('FALSE') || this._matchKeyword('NULL')) {
        this._advance();
        return;
      }

      throw new ParseError('Expresión SQL inválida o inesperada', this._position());
    }

    _parseIdentifier() {
      if (this._matchType('identifier') || this._matchType('quotedIdentifier') || this._matchKeyword('ONLY') || this._matchKeyword('TEMP') || this._matchKeyword('TEMPORARY') || this._matchKeyword('UNLOGGED')) {
        this._advance();
        return;
      }
      throw new ParseError('Identificador SQL esperado', this._position());
    }

    _matchType(type) {
      return !this._isAtEnd() && this.tokens[this.position].type === type;
    }

    _matchIdentifier() {
      return !this._isAtEnd() && (this.tokens[this.position].type === 'identifier' || this.tokens[this.position].type === 'quotedIdentifier');
    }

    _matchKeyword(value) {
      return !this._isAtEnd() && this.tokens[this.position].type === 'keyword' && this.tokens[this.position].value === value;
    }

    _matchSymbol(value) {
      return !this._isAtEnd() && this.tokens[this.position].type === 'symbol' && this.tokens[this.position].value === value;
    }

    _matchOperator() {
      return !this._isAtEnd() && (
        this.tokens[this.position].type === 'operator' ||
        (this.tokens[this.position].type === 'symbol' && ['=', '<', '>', '+', '-', '*', '/', '%'].includes(this.tokens[this.position].value))
      );
    }

    _expectKeyword(value) {
      if (!this._matchKeyword(value)) {
        throw new ParseError(`Se esperaba la palabra clave ${value}`, this._position());
      }
      this._advance();
    }

    _expectSymbol(value) {
      if (!this._matchSymbol(value)) {
        throw new ParseError(`Se esperaba el símbolo ${value}`, this._position());
      }
      this._advance();
    }

    _advance() {
      if (!this._isAtEnd()) {
        this.position += 1;
      }
    }

    _isAtEnd() {
      return this.position >= this.tokens.length;
    }

    _position() {
      return this.position < this.tokens.length ? this.position : this.tokens.length;
    }
  }

  function detectStatementTypeFromTokens(tokens) {
    const firstCommand = tokens.find((token) => token.type === 'keyword' && ['WITH', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE'].includes(token.value));
    if (!firstCommand) return 'Desconocido';
    if (firstCommand.value !== 'WITH') return firstCommand.value;
    const afterWith = tokens.find((token) => token.type === 'keyword' && ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(token.value));
    return afterWith ? `WITH ${afterWith.value}` : 'WITH';
  }

  function countSqlCommands(tokens) {
    return tokens.filter((token) => token.type === 'keyword' && ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE', 'WITH'].includes(token.value)).length;
  }

  function estimateComplexity(tokens, lineCount, commandCount) {
    const joinCount = tokens.filter((token) => token.type === 'keyword' && token.value === 'JOIN').length;
    const clauseCount = tokens.filter((token) => token.type === 'keyword' && ['WHERE', 'GROUP', 'ORDER', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH'].includes(token.value)).length;
    if (commandCount > 2 || joinCount > 2 || clauseCount > 4 || tokens.length > 120 || lineCount > 20) return 'alta';
    if (commandCount > 1 || joinCount > 0 || clauseCount > 1 || tokens.length > 35 || lineCount > 6) return 'media';
    return 'baja';
  }

  function buildStats(sql, tokens, diagnostics) {
    const lineCount = String(sql || '').replace(/\r\n/g, '\n').split('\n').length;
    const commandCount = Math.max(
      1,
      String(sql || '').split(';').map((part) => part.trim()).filter(Boolean).length,
      countSqlCommands(tokens)
    );
    return {
      lines: lineCount,
      commands: commandCount,
      statementType: detectStatementTypeFromTokens(tokens),
      errors: diagnostics.errors.length,
      warnings: diagnostics.warnings.length,
      complexity: estimateComplexity(tokens, lineCount, commandCount)
    };
  }

  function messageForDiagnostics(diagnostics) {
    if (diagnostics.errors.length) return `❌ Error: ${diagnostics.errors[0]}`;
    if (diagnostics.warnings.length) return `⚠️ Advertencia: ${diagnostics.warnings[0]}`;
    return '✅ Sintaxis PostgreSQL válida';
  }

  function recommendationForError(message) {
    if (/INSERT incompleto|se esperaba VALUES/i.test(message)) return 'Agregá VALUES (...), DEFAULT VALUES o un SELECT después del INSERT.';
    if (/Expresión SQL inválida o inesperada/i.test(message)) return 'Revisá que cada SELECT tenga columnas o expresiones antes de FROM/WHERE.';
    if (/Cantidad de valores/i.test(message)) return 'Revisá que la cantidad de columnas coincida con la cantidad de valores en cada grupo VALUES.';
    if (/Columna sin tipo|Tipo de dato esperado/i.test(message)) return 'Indicá un tipo de dato para cada columna, por ejemplo id SERIAL o name TEXT.';
    if (/coma sobrante/i.test(message)) return 'Eliminá la coma sobrante o agregá la definición que falta.';
    if (/coma entre definiciones/i.test(message)) return 'Separá cada columna o constraint con una coma.';
    if (/Cadena o identificador entre comillas sin cerrar/i.test(message)) return 'Cerrá la comilla de texto o identificador antes de continuar.';
    if (/Se esperaba el símbolo \)/i.test(message)) return 'Cerrá los paréntesis abiertos.';
    if (/INTO/i.test(message)) return 'Usá la forma INSERT INTO tabla (...) VALUES (...).';
    return '';
  }

  function collectWarnings(tokens, sql) {
    const warnings = [];
    const starters = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
    let lastSemicolonPosition = -1;
    let seenStarter = null;

    tokens.forEach((token, index) => {
      if (token.type === 'symbol' && token.value === ';') {
        lastSemicolonPosition = index;
        seenStarter = null;
        return;
      }
      if (token.type === 'keyword' && starters.includes(token.value)) {
        if (seenStarter && lastSemicolonPosition < index) {
          warnings.push(`Se detectó una posible mezcla de comandos (${seenStarter} y ${token.value}) sin separador claro.`);
        }
        seenStarter = token.value;
      }
    });

    if (String(sql || '').trim() && !/;\s*$/.test(String(sql || '').trim())) {
      warnings.push('La sentencia no termina con punto y coma; puede ser válido, pero dificulta analizar múltiples comandos.');
    }

    return warnings;
  }

  function analyzePostgresSql(sql) {
    const trimmed = sql.replace(/\r\n/g, '\n');
    const tokenizer = new Tokenizer(trimmed);
    const tokens = tokenizer.tokenize().filter(Boolean);
    const diagnostics = {
      errors: [],
      warnings: [],
      recommendations: [],
      info: []
    };

    if (!tokens.length) {
      diagnostics.errors.push('consulta vacía o solo comentarios');
      diagnostics.recommendations.push('Ingresá una sentencia SQL antes de analizar.');
      return {
        valid: false,
        status: 'error',
        message: messageForDiagnostics(diagnostics),
        ...diagnostics,
        stats: buildStats(sql, tokens, diagnostics)
      };
    }

    try {
      const parser = new Parser(tokens);
      parser.parseStatements();
    } catch (error) {
      if (error instanceof ParseError) {
        diagnostics.errors.push(error.message);
        const recommendation = recommendationForError(error.message);
        if (recommendation) diagnostics.recommendations.push(recommendation);
      } else {
        diagnostics.errors.push('Error interno al validar SQL');
      }
    }

    if (!diagnostics.errors.length) {
      diagnostics.warnings.push(...collectWarnings(tokens, sql));
    }

    diagnostics.info.push('Análisis estático local: no ejecuta SQL ni verifica objetos reales de la base.');

    const status = diagnostics.errors.length ? 'error' : (diagnostics.warnings.length ? 'warning' : 'ok');
    return {
      valid: !diagnostics.errors.length,
      status,
      message: messageForDiagnostics(diagnostics),
      ...diagnostics,
      stats: buildStats(sql, tokens, diagnostics)
    };
  }

  function validatePostgresSqlSyntax(sql) {
    return analyzePostgresSql(sql);
  }

  function safeValidatePostgresSqlSyntax(sql) {
    try {
      return validatePostgresSqlSyntax(sql);
    } catch (error) {
      if (error instanceof ParseError) {
        const diagnostics = {
          errors: [error.message],
          warnings: [],
          recommendations: [recommendationForError(error.message)].filter(Boolean),
          info: [],
          stats: { lines: 0, commands: 0, statementType: 'Desconocido', errors: 1, warnings: 0, complexity: 'baja' }
        };
        return { valid: false, status: 'error', message: `❌ Error: ${error.message}`, ...diagnostics };
      }
      return {
        valid: false,
        status: 'error',
        message: '❌ Error interno al validar SQL',
        errors: ['Error interno al validar SQL'],
        warnings: [],
        recommendations: [],
        info: [],
        stats: { lines: 0, commands: 0, statementType: 'Desconocido', errors: 1, warnings: 0, complexity: 'baja' }
      };
    }
  }

  window.validatePostgresSqlSyntax = safeValidatePostgresSqlSyntax;
  window.analyzePostgresSql = safeValidatePostgresSqlSyntax;
})();
