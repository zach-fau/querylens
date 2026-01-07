/**
 * SQL Parser Module
 *
 * Parses PostgreSQL queries using pgsql-ast-parser and extracts
 * structured data about tables, columns, joins, and conditions.
 */

import { parse } from 'pgsql-ast-parser';
import type {
  ParsedQuery,
  ParsedTable,
  ParsedColumn,
  ParsedJoin,
} from '@/types';
import { QueryType, JoinType } from '@/types';
import type { Schema } from '@/lib/schema-parser';

// Type definitions for AST nodes from pgsql-ast-parser
// These are partial types to satisfy ESLint - the library doesn't export full types
// Using 'any' here is acceptable as pgsql-ast-parser doesn't export proper types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = Record<string, any>;
type Statement = ASTNode & { type?: string };
type SelectStatement = Statement & {
  from?: FromItem[];
  columns?: ASTNode[];
  where?: Expression;
  groupBy?: Expression[];
  orderBy?: OrderByItem[];
};
type InsertStatement = Statement & {
  into?: TableRef;
  columns?: (string | { name: string })[];
};
type UpdateStatement = Statement & {
  table?: TableRef;
  sets?: SetItem[];
  where?: Expression;
};
type DeleteStatement = Statement & {
  from?: TableRef;
  where?: Expression;
};
type CTEStatement = Statement & {
  bind?: CTEItem[];
  in?: SelectStatement;
};
type UnionStatement = Statement & {
  left?: SelectStatement | UnionStatement;
  right?: SelectStatement | UnionStatement;
};
type FromItem = ASTNode & {
  type?: string;
  name?: TableRef;
  alias?: { name?: string };
  schema?: string;
  join?: JoinItem;
};
type JoinItem = ASTNode & {
  type?: string;
  on?: Expression;
};
type Expression = ASTNode & {
  type?: string;
  op?: string;
  left?: Expression;
  right?: Expression;
  operand?: Expression;
  table?: { name?: string };
  name?: string;
  value?: unknown;
  args?: Expression[];
  whens?: WhenItem[];
  else?: Expression;
  expr?: ASTNode;
};
type OrderByItem = ASTNode & {
  by?: Expression;
};
type TableRef = ASTNode & {
  name?: string;
  alias?: string;
  schema?: string;
};
type SetItem = ASTNode & {
  column?: string | { name?: string };
};
type CTEItem = ASTNode & {
  statement?: Statement;
  alias?: string;
};
type WhenItem = ASTNode & {
  when?: Expression;
  value?: Expression;
};

/**
 * Parse a SQL query string and extract structured information
 *
 * @param sql - The SQL query string to parse
 * @param schema - Optional database schema for column validation
 * @returns Structured query data including tables, columns, joins, and conditions
 * @throws Error if SQL is invalid or cannot be parsed
 */
export function parseSQL(sql: string, schema?: Schema): ParsedQuery {
  if (!sql || sql.trim().length === 0) {
    throw new Error('SQL query cannot be empty');
  }

  try {
    const ast = parse(sql);

    if (!ast || ast.length === 0) {
      throw new Error('No valid SQL statements found');
    }

    // Cast to our custom Statement type
    const result = processStatements(ast as Statement[], sql);

    // If schema is provided, validate columns and add data types
    if (schema) {
      validateColumnsAgainstSchema(result, schema);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Failed to parse SQL: ${message}`);
  }
}

/**
 * Validate SQL syntax without full parsing
 *
 * @param sql - The SQL query string to validate
 * @returns Validation result with success status and optional error message
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  if (!sql || sql.trim().length === 0) {
    return {
      valid: false,
      error: 'SQL query cannot be empty',
    };
  }

  try {
    parse(sql);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid SQL syntax',
    };
  }
}

/**
 * Extract all tables from a parsed query
 *
 * @param parsedQuery - The parsed query object
 * @returns Array of tables with their aliases
 */
export function extractTables(parsedQuery: ParsedQuery): ParsedTable[] {
  return parsedQuery.tables;
}

/**
 * Extract all columns from a parsed query with their roles
 *
 * @param parsedQuery - The parsed query object
 * @returns Array of columns with role indicators (selected/join/filter)
 */
export function extractColumns(parsedQuery: ParsedQuery): ParsedColumn[] {
  return parsedQuery.columns;
}

/**
 * Extract all JOIN relationships from a parsed query
 *
 * @param parsedQuery - The parsed query object
 * @returns Array of join relationships
 */
export function extractJoins(parsedQuery: ParsedQuery): ParsedJoin[] {
  return parsedQuery.joins;
}

// ==================== Internal Processing Functions ====================

/**
 * Process AST statements and extract query information
 */
function processStatements(statements: Statement[], rawSql: string): ParsedQuery {
  const tables: ParsedTable[] = [];
  const columns: ParsedColumn[] = [];
  const joins: ParsedJoin[] = [];
  const whereConditions: string[] = [];
  const ctes: ParsedQuery[] = [];
  const subqueries: ParsedQuery[] = [];

  let queryType: QueryType = QueryType.SELECT;

  for (const stmt of statements) {
    if (!stmt || !stmt.type) continue;

    switch (stmt.type) {
      case 'select':
        queryType = QueryType.SELECT;
        extractFromSelect(stmt, tables, columns, joins, whereConditions, subqueries, rawSql);
        break;
      case 'insert':
        queryType = QueryType.INSERT;
        extractFromInsert(stmt, tables, columns);
        break;
      case 'update':
        queryType = QueryType.UPDATE;
        extractFromUpdate(stmt, tables, columns, whereConditions);
        break;
      case 'delete':
        queryType = QueryType.DELETE;
        extractFromDelete(stmt, tables, columns, whereConditions);
        break;
      case 'with':
        queryType = QueryType.CTE;
        extractFromCTE(stmt, ctes, tables, columns, joins, whereConditions, rawSql);
        break;
      case 'union':
      case 'union all':
        queryType = QueryType.SELECT;
        extractFromUnion(stmt as UnionStatement, tables, columns, joins, whereConditions, subqueries, rawSql);
        break;
    }
  }

  // Deduplicate columns (same column might appear multiple times with different roles)
  const deduplicatedColumns = deduplicateColumns(columns);

  return {
    type: queryType,
    tables,
    columns: deduplicatedColumns,
    joins,
    whereConditions,
    ctes,
    subqueries,
    rawSql,
  };
}

/**
 * Extract information from SELECT statement
 */
function extractFromSelect(
  stmt: SelectStatement,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  joins: ParsedJoin[],
  whereConditions: string[],
  subqueries: ParsedQuery[],
  rawSql: string
): void {
  // Extract tables from FROM clause
  if (stmt.from) {
    for (const fromItem of stmt.from) {
      extractFromClause(fromItem, tables, joins, columns, subqueries, rawSql);
    }
  }

  // Extract selected columns
  if (stmt.columns) {
    for (const col of stmt.columns) {
      extractSelectColumn(col as ASTNode, columns, tables);
    }
  }

  // Extract WHERE conditions
  if (stmt.where) {
    extractWhereConditions(stmt.where, whereConditions, columns, tables);
  }

  // Extract GROUP BY columns
  if (stmt.groupBy) {
    for (const groupCol of stmt.groupBy) {
      extractColumnReference(groupCol, columns, tables, false, false, true, false);
    }
  }

  // Extract ORDER BY columns
  if (stmt.orderBy) {
    for (const orderCol of stmt.orderBy) {
      if (orderCol.by) {
        extractColumnReference(orderCol.by, columns, tables, false, false, true, false);
      }
    }
  }
}

/**
 * Extract information from INSERT statement
 */
function extractFromInsert(stmt: InsertStatement, tables: ParsedTable[], columns: ParsedColumn[]): void {
  // Extract target table
  if (stmt.into) {
    const tableName = extractTableName(stmt.into);
    if (tableName) {
      tables.push({
        name: tableName,
        schema: stmt.into.schema,
      });

      // Extract columns being inserted
      if (stmt.columns) {
        for (const col of stmt.columns) {
          const colName = typeof col === 'string' ? col : col.name;
          if (colName) {
            columns.push({
              name: colName,
              table: tableName,
              isSelected: false,
              isJoinColumn: false,
              isFilterColumn: false,
              isModified: true,
            });
          }
        }
      }
    }
  }
}

/**
 * Extract information from UPDATE statement
 */
function extractFromUpdate(
  stmt: UpdateStatement,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  whereConditions: string[]
): void {
  // Extract target table
  if (stmt.table) {
    const tableName = extractTableName(stmt.table);
    if (tableName) {
      tables.push({
        name: tableName,
        alias: stmt.table.alias,
        schema: stmt.table.schema,
      });

      // Extract columns being updated
      if (stmt.sets) {
        for (const set of stmt.sets) {
          const columnName = typeof set.column === 'string'
            ? set.column
            : set.column?.name;
          if (columnName) {
            columns.push({
              name: columnName,
              table: tableName,
              isSelected: false,
              isJoinColumn: false,
              isFilterColumn: false,
              isModified: true,
            });
          }
        }
      }
    }
  }

  // Extract WHERE conditions
  if (stmt.where) {
    extractWhereConditions(stmt.where, whereConditions, columns, tables);
  }
}

/**
 * Extract information from DELETE statement
 */
function extractFromDelete(
  stmt: DeleteStatement,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  whereConditions: string[]
): void {
  // Extract target table
  if (stmt.from) {
    const tableName = extractTableName(stmt.from);
    if (tableName) {
      tables.push({
        name: tableName,
        alias: stmt.from.alias,
        schema: stmt.from.schema,
      });
    }
  }

  // Extract WHERE conditions
  if (stmt.where) {
    extractWhereConditions(stmt.where, whereConditions, columns, tables);
  }
}

/**
 * Extract information from CTE (WITH clause)
 */
function extractFromCTE(
  stmt: CTEStatement,
  ctes: ParsedQuery[],
  tables: ParsedTable[],
  columns: ParsedColumn[],
  joins: ParsedJoin[],
  whereConditions: string[],
  rawSql: string
): void {
  // Process each CTE
  if (stmt.bind) {
    for (const cte of stmt.bind) {
      if (cte.statement) {
        const cteParsed = processStatements([cte.statement], rawSql);
        ctes.push(cteParsed);

        // Add CTE as a virtual table
        if (cte.alias) {
          tables.push({
            name: cte.alias,
            alias: cte.alias,
          });
        }
      }
    }
  }

  // Process the main query after WITH
  if (stmt.in) {
    extractFromSelect(stmt.in, tables, columns, joins, whereConditions, [], rawSql);
  }
}

/**
 * Extract information from UNION statement
 * Recursively processes left and right sides of UNION
 */
function extractFromUnion(
  stmt: UnionStatement,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  joins: ParsedJoin[],
  whereConditions: string[],
  subqueries: ParsedQuery[],
  rawSql: string
): void {
  // Process left side
  if (stmt.left) {
    if (stmt.left.type === 'select') {
      extractFromSelect(stmt.left, tables, columns, joins, whereConditions, subqueries, rawSql);
    } else if (stmt.left.type === 'union' || stmt.left.type === 'union all') {
      extractFromUnion(stmt.left as UnionStatement, tables, columns, joins, whereConditions, subqueries, rawSql);
    }
  }

  // Process right side
  if (stmt.right) {
    if (stmt.right.type === 'select') {
      extractFromSelect(stmt.right, tables, columns, joins, whereConditions, subqueries, rawSql);
    } else if (stmt.right.type === 'union' || stmt.right.type === 'union all') {
      extractFromUnion(stmt.right as UnionStatement, tables, columns, joins, whereConditions, subqueries, rawSql);
    }
  }
}

/**
 * Extract table and join information from FROM clause
 */
function extractFromClause(
  fromItem: FromItem,
  tables: ParsedTable[],
  joins: ParsedJoin[],
  columns: ParsedColumn[],
  subqueries: ParsedQuery[],
  rawSql: string
): void {
  if (!fromItem) return;

  if (fromItem.type === 'table') {
    // Regular table reference
    const tableName = extractTableName(fromItem);
    if (tableName) {
      tables.push({
        name: tableName,
        alias: fromItem.alias?.name || fromItem.name?.alias,
        schema: fromItem.schema || fromItem.name?.schema,
      });

      // Check if this table has a JOIN attached
      if (fromItem.join) {
        const joinInfo = extractJoinInfo(fromItem, tables);
        if (joinInfo) {
          joins.push(joinInfo);

          // Mark join columns
          markJoinColumns(columns, tables, joinInfo.leftTable, joinInfo.leftColumn);
          markJoinColumns(columns, tables, joinInfo.rightTable, joinInfo.rightColumn);

          // Extract column references from join condition
          if (fromItem.join.on) {
            extractWhereConditions(fromItem.join.on, [], columns, tables, true);
          }
        }
      }
    }
  } else if (fromItem.type === 'statement') {
    // Subquery in FROM clause
    const subquery = processStatements([fromItem], rawSql);
    subqueries.push(subquery);

    // Add subquery as virtual table if it has an alias
    if (fromItem.alias) {
      const aliasName = typeof fromItem.alias === 'string'
        ? fromItem.alias
        : (fromItem.alias.name ?? 'unknown');
      tables.push({
        name: aliasName,
        alias: aliasName,
      });
    }
  }
}

/**
 * Extract JOIN information from a table item
 */
function extractJoinInfo(tableItem: FromItem, tables: ParsedTable[]): ParsedJoin | null {
  if (!tableItem.join || !tableItem.join.on) return null;

  const joinType = normalizeJoinType(tableItem.join.type);
  const onCondition = tableItem.join.on;

  if (onCondition.type === 'binary' && onCondition.op === '=') {
    const left = onCondition.left;
    const right = onCondition.right;

    if (left?.type === 'ref' && right?.type === 'ref') {
      const leftTable = resolveTableName(left.table?.name, tables);
      const rightTable = resolveTableName(right.table?.name, tables);

      return {
        type: joinType,
        leftTable: leftTable || '',
        rightTable: rightTable || '',
        leftColumn: left.name || '',
        rightColumn: right.name || '',
        condition: `${leftTable || left.table?.name}.${left.name} = ${rightTable || right.table?.name}.${right.name}`,
      };
    }
  }

  return null;
}


/**
 * Extract column from SELECT clause
 */
function extractSelectColumn(col: ASTNode, columns: ParsedColumn[], tables: ParsedTable[]): void {
  if (!col) return;

  if (col.expr?.type === 'ref') {
    // Simple column reference: SELECT users.name
    const tableName = resolveTableName(col.expr.table?.name, tables);
    columns.push({
      name: col.expr.name,
      table: tableName,
      alias: col.alias?.name,
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    });
  } else if (col.expr?.type === 'call') {
    // Function call: SELECT COUNT(*)
    // Extract any column references inside the function
    extractFunctionColumns(col.expr, columns, tables);
  } else if (col.expr?.type === 'binary') {
    // Expression: SELECT price * quantity AS total
    extractBinaryColumns(col.expr, columns, tables);
  } else if (col.expr?.type === 'cast') {
    // Type cast: SELECT created_at::date
    if (col.expr.operand?.type === 'ref') {
      const tableName = resolveTableName(col.expr.operand.table?.name, tables);
      columns.push({
        name: col.expr.operand.name,
        table: tableName,
        alias: col.alias?.name,
        isSelected: true,
        isJoinColumn: false,
        isFilterColumn: false,
        isModified: false,
      });
    }
  } else if (col.expr?.type === 'case') {
    // CASE expression
    extractCaseColumns(col.expr, columns, tables);
  }
}

/**
 * Extract columns from function calls
 */
function extractFunctionColumns(func: Expression, columns: ParsedColumn[], tables: ParsedTable[]): void {
  if (func.args) {
    for (const arg of func.args) {
      extractColumnReference(arg, columns, tables, true, false, false, false);
    }
  }
}

/**
 * Extract columns from binary expressions
 */
function extractBinaryColumns(expr: Expression, columns: ParsedColumn[], tables: ParsedTable[]): void {
  if (expr.left) {
    extractColumnReference(expr.left, columns, tables, true, false, false, false);
  }
  if (expr.right) {
    extractColumnReference(expr.right, columns, tables, true, false, false, false);
  }
}

/**
 * Extract columns from CASE expressions
 */
function extractCaseColumns(caseExpr: Expression, columns: ParsedColumn[], tables: ParsedTable[]): void {
  // Extract from WHEN conditions
  if (caseExpr.whens) {
    for (const when of caseExpr.whens) {
      if (when.when) {
        extractColumnReference(when.when, columns, tables, true, false, false, false);
      }
      if (when.value) {
        extractColumnReference(when.value, columns, tables, true, false, false, false);
      }
    }
  }
  // Extract from ELSE
  if (caseExpr.else) {
    extractColumnReference(caseExpr.else, columns, tables, true, false, false, false);
  }
}

/**
 * Extract WHERE conditions and referenced columns
 */
function extractWhereConditions(
  where: Expression,
  conditions: string[],
  columns: ParsedColumn[],
  tables: ParsedTable[],
  isJoinCondition: boolean = false
): void {
  if (!where) return;

  // Traverse the condition tree
  if (where.type === 'binary') {
    // Check if this is a logical operator (AND/OR) that needs recursion
    if (where.op === 'AND' || where.op === 'OR') {
      // Recurse into both sides
      if (where.left) {
        extractWhereConditions(where.left, conditions, columns, tables, isJoinCondition);
      }
      if (where.right) {
        extractWhereConditions(where.right, conditions, columns, tables, isJoinCondition);
      }
    } else {
      // Regular comparison: col = value, col > value, etc.
      extractBinaryCondition(where, conditions, columns, tables, isJoinCondition);
    }
  } else if (where.type === 'unary') {
    // Unary operation: NOT, IS NULL, etc.
    if (where.operand) {
      extractWhereConditions(where.operand, conditions, columns, tables, isJoinCondition);
    }
  } else if (where.type === 'ternary') {
    // Ternary: BETWEEN, LIKE, etc.
    if (where.value) {
      extractColumnReference(where.value as Expression, columns, tables, false, isJoinCondition, true, false);
    }
  } else if (where.type === 'ref') {
    // Direct column reference
    extractColumnReference(where, columns, tables, false, isJoinCondition, true, false);
  } else if (where.type === 'call') {
    // Function in WHERE
    extractFunctionColumns(where, columns, tables);
  }
}

/**
 * Extract binary condition (e.g., col = value)
 */
function extractBinaryCondition(
  binary: Expression,
  conditions: string[],
  columns: ParsedColumn[],
  tables: ParsedTable[],
  isJoinCondition: boolean
): void {
  // Extract left side
  if (binary.left) {
    extractColumnReference(binary.left, columns, tables, false, isJoinCondition, !isJoinCondition, false);
  }

  // Extract right side
  if (binary.right) {
    extractColumnReference(binary.right, columns, tables, false, isJoinCondition, !isJoinCondition, false);
  }

  // Build condition string
  const leftStr = binary.left ? stringifyExpression(binary.left) : '';
  const rightStr = binary.right ? stringifyExpression(binary.right) : '';
  if (leftStr && rightStr && binary.op) {
    conditions.push(`${leftStr} ${binary.op} ${rightStr}`);
  }
}

/**
 * Extract column reference from any expression
 */
function extractColumnReference(
  expr: Expression,
  columns: ParsedColumn[],
  tables: ParsedTable[],
  isSelected: boolean,
  isJoinColumn: boolean,
  isFilterColumn: boolean,
  isModified: boolean
): void {
  if (!expr) return;

  if (expr.type === 'ref') {
    const tableName = resolveTableName(expr.table?.name, tables);

    // Check if this column already exists with different role
    const existing = columns.find(
      c => c.name === expr.name && c.table === tableName
    );

    if (existing) {
      // Update flags without creating duplicate
      existing.isSelected = existing.isSelected || isSelected;
      existing.isJoinColumn = existing.isJoinColumn || isJoinColumn;
      existing.isFilterColumn = existing.isFilterColumn || isFilterColumn;
      existing.isModified = existing.isModified || isModified;
    } else {
      columns.push({
        name: expr.name ?? '',
        table: tableName,
        isSelected,
        isJoinColumn,
        isFilterColumn,
        isModified,
      });
    }
  } else if (expr.type === 'binary') {
    extractBinaryColumns(expr, columns, tables);
  } else if (expr.type === 'call') {
    extractFunctionColumns(expr, columns, tables);
  } else if (expr.type === 'cast') {
    if (expr.operand) {
      extractColumnReference(expr.operand, columns, tables, isSelected, isJoinColumn, isFilterColumn, isModified);
    }
  }
}

// ==================== Helper Functions ====================

/**
 * Extract table name from various node types
 */
function extractTableName(node: TableRef | ASTNode): string | undefined {
  if (!node) return undefined;

  if (typeof node === 'string') {
    return node;
  }

  if (node.name) {
    return typeof node.name === 'string' ? node.name : node.name.name;
  }

  return undefined;
}

/**
 * Resolve table name from alias or direct name
 */
function resolveTableName(nameOrAlias: string | undefined, tables: ParsedTable[]): string | undefined {
  if (!nameOrAlias) return undefined;

  // Check if it's an alias
  const tableWithAlias = tables.find(t => t.alias === nameOrAlias);
  if (tableWithAlias) {
    return tableWithAlias.name;
  }

  // Otherwise return as-is
  return nameOrAlias;
}

/**
 * Normalize join type to our enum values
 */
function normalizeJoinType(type: string | undefined): JoinType {
  if (!type) return JoinType.INNER;

  const normalized = type.toUpperCase();
  if (normalized.includes('LEFT')) return JoinType.LEFT;
  if (normalized.includes('RIGHT')) return JoinType.RIGHT;
  if (normalized.includes('FULL')) return JoinType.FULL;
  if (normalized.includes('CROSS')) return JoinType.CROSS;
  return JoinType.INNER;
}

/**
 * Mark columns as join columns
 */
function markJoinColumns(
  columns: ParsedColumn[],
  tables: ParsedTable[],
  tableNameOrAlias: string,
  columnName: string
): void {
  const tableName = resolveTableName(tableNameOrAlias, tables) || tableNameOrAlias;

  const col = columns.find(c => c.name === columnName && c.table === tableName);
  if (col) {
    col.isJoinColumn = true;
  } else {
    columns.push({
      name: columnName,
      table: tableName,
      isSelected: false,
      isJoinColumn: true,
      isFilterColumn: false,
      isModified: false,
    });
  }
}

/**
 * Convert expression to string representation
 */
function stringifyExpression(expr: Expression): string {
  if (!expr) return '';

  if (expr.type === 'ref') {
    return expr.table ? `${expr.table.name ?? ''}.${expr.name ?? ''}` : (expr.name ?? '');
  }

  if (expr.type === 'integer' || expr.type === 'numeric') {
    return String(expr.value);
  }

  if (expr.type === 'string') {
    return `'${expr.value}'`;
  }

  if (expr.type === 'binary') {
    const left = expr.left ? stringifyExpression(expr.left) : '';
    const right = expr.right ? stringifyExpression(expr.right) : '';
    return `${left} ${expr.op ?? ''} ${right}`;
  }

  return '';
}

/**
 * Deduplicate columns while preserving all role flags
 */
function deduplicateColumns(columns: ParsedColumn[]): ParsedColumn[] {
  const map = new Map<string, ParsedColumn>();

  for (const col of columns) {
    const key = `${col.table || ''}.${col.name}`;
    const existing = map.get(key);

    if (existing) {
      // Merge flags
      existing.isSelected = existing.isSelected || col.isSelected;
      existing.isJoinColumn = existing.isJoinColumn || col.isJoinColumn;
      existing.isFilterColumn = existing.isFilterColumn || col.isFilterColumn;
      existing.isModified = existing.isModified || col.isModified;
      // Keep first alias found
      if (!existing.alias && col.alias) {
        existing.alias = col.alias;
      }
    } else {
      map.set(key, { ...col });
    }
  }

  return Array.from(map.values());
}

// ==================== Schema Validation Functions ====================

/**
 * Validate columns against the provided schema and add data types
 */
function validateColumnsAgainstSchema(result: ParsedQuery, schema: Schema): void {
  // Build a mapping of table aliases to real table names
  const aliasToTable = new Map<string, string>();
  for (const table of result.tables) {
    const realName = table.name.toLowerCase();
    if (table.alias) {
      aliasToTable.set(table.alias.toLowerCase(), realName);
    }
    aliasToTable.set(realName, realName);
  }

  // Validate each column
  for (const column of result.columns) {
    // Skip columns without table context (e.g., literals, expressions)
    if (!column.table) {
      // Try to infer table from schema if there's only one match
      const matchingTables = findTablesWithColumn(schema, result.tables, column.name);
      if (matchingTables.length === 1) {
        column.table = matchingTables[0];
        const dataType = lookupColumnInSchema(schema, matchingTables[0], column.name);
        if (dataType) {
          column.dataType = dataType;
          column.isValid = true;
        }
      } else if (matchingTables.length > 1) {
        // Ambiguous column - mark as valid if it exists in any table
        column.isValid = true;
      } else {
        // Column not found in any known table
        column.isValid = false;
      }
      continue;
    }

    // Resolve alias to real table name
    const tableName = aliasToTable.get(column.table.toLowerCase()) || column.table.toLowerCase();

    // Check if table exists in schema
    const tableSchema = schema.tables[tableName];
    if (!tableSchema) {
      // Table not in schema - can't validate, leave isValid undefined
      continue;
    }

    // Check if column exists in table
    const columnLower = column.name.toLowerCase();
    const dataType = tableSchema[columnLower];

    if (dataType) {
      column.isValid = true;
      column.dataType = dataType;
    } else {
      column.isValid = false;
    }
  }
}

/**
 * Find all tables that contain a column with the given name
 */
function findTablesWithColumn(
  schema: Schema,
  queryTables: ParsedTable[],
  columnName: string
): string[] {
  const matches: string[] = [];
  const columnLower = columnName.toLowerCase();

  for (const table of queryTables) {
    const tableName = table.name.toLowerCase();
    const tableSchema = schema.tables[tableName];
    if (tableSchema && columnLower in tableSchema) {
      matches.push(table.name);
    }
  }

  return matches;
}

/**
 * Look up a column's data type in the schema
 */
function lookupColumnInSchema(
  schema: Schema,
  tableName: string,
  columnName: string
): string | undefined {
  const tableSchema = schema.tables[tableName.toLowerCase()];
  if (!tableSchema) return undefined;
  return tableSchema[columnName.toLowerCase()];
}
