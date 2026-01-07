/**
 * SQL Parser Module
 *
 * Parses PostgreSQL queries using pgsql-ast-parser and extracts
 * structured data about tables, columns, joins, and conditions.
 */

import { parse, Statement } from 'pgsql-ast-parser';
import type { ParsedQuery, ParsedTable, ParsedColumn, ParsedJoin } from '@/types';

/**
 * Parse a SQL query string and extract structured information
 */
export function parseSQL(sql: string): ParsedQuery {
  try {
    const ast = parse(sql);
    return processStatements(ast, sql);
  } catch (error) {
    throw new Error(`Failed to parse SQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

  let queryType: ParsedQuery['type'] = 'SELECT';

  for (const stmt of statements) {
    switch (stmt.type) {
      case 'select':
        queryType = 'SELECT';
        extractFromSelect(stmt, tables, columns, joins, whereConditions);
        break;
      case 'insert':
        queryType = 'INSERT';
        extractFromInsert(stmt, tables, columns);
        break;
      case 'update':
        queryType = 'UPDATE';
        extractFromUpdate(stmt, tables, columns, whereConditions);
        break;
      case 'delete':
        queryType = 'DELETE';
        extractFromDelete(stmt, tables, whereConditions);
        break;
      case 'with':
        queryType = 'CTE';
        // Process CTEs recursively
        if (stmt.bind) {
          for (const cte of stmt.bind) {
            if (cte.statement) {
              const cteParsed = processStatements([cte.statement], rawSql);
              ctes.push(cteParsed);
            }
          }
        }
        break;
    }
  }

  return {
    type: queryType,
    tables,
    columns,
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
  stmt: any,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  joins: ParsedJoin[],
  whereConditions: string[]
): void {
  // Extract tables from FROM clause
  if (stmt.from) {
    extractTables(stmt.from, tables, joins);
  }

  // Extract selected columns
  if (stmt.columns) {
    for (const col of stmt.columns) {
      extractColumn(col, columns, true, false, false, false);
    }
  }

  // Extract WHERE conditions
  if (stmt.where) {
    extractWhereConditions(stmt.where, whereConditions, columns);
  }
}

/**
 * Extract information from INSERT statement
 */
function extractFromInsert(stmt: any, tables: ParsedTable[], columns: ParsedColumn[]): void {
  if (stmt.into?.name) {
    tables.push({
      name: stmt.into.name,
      schema: stmt.into.schema,
    });
  }

  if (stmt.columns) {
    for (const col of stmt.columns) {
      columns.push({
        name: typeof col === 'string' ? col : col.name,
        table: stmt.into?.name,
        isSelected: false,
        isJoinColumn: false,
        isFilterColumn: false,
        isModified: true,
      });
    }
  }
}

/**
 * Extract information from UPDATE statement
 */
function extractFromUpdate(
  stmt: any,
  tables: ParsedTable[],
  columns: ParsedColumn[],
  whereConditions: string[]
): void {
  if (stmt.table?.name) {
    tables.push({
      name: stmt.table.name,
      schema: stmt.table.schema,
    });
  }

  if (stmt.sets) {
    for (const set of stmt.sets) {
      columns.push({
        name: set.column,
        table: stmt.table?.name,
        isSelected: false,
        isJoinColumn: false,
        isFilterColumn: false,
        isModified: true,
      });
    }
  }

  if (stmt.where) {
    extractWhereConditions(stmt.where, whereConditions, columns);
  }
}

/**
 * Extract information from DELETE statement
 */
function extractFromDelete(stmt: any, tables: ParsedTable[], whereConditions: string[]): void {
  if (stmt.from?.name) {
    tables.push({
      name: stmt.from.name,
      schema: stmt.from.schema,
    });
  }

  if (stmt.where) {
    const columns: ParsedColumn[] = [];
    extractWhereConditions(stmt.where, whereConditions, columns);
  }
}

/**
 * Extract tables from FROM clause (handles JOINs)
 */
function extractTables(from: any[], tables: ParsedTable[], joins: ParsedJoin[]): void {
  for (const item of from) {
    if (item.type === 'table') {
      tables.push({
        name: item.name.name,
        alias: item.name.alias,
        schema: item.name.schema,
      });
    } else if (item.type === 'join') {
      // Process left and right sides of join
      if (item.on) {
        const joinInfo = extractJoinInfo(item);
        if (joinInfo) {
          joins.push(joinInfo);
        }
      }
    }
  }
}

/**
 * Extract join information
 */
function extractJoinInfo(joinItem: any): ParsedJoin | null {
  const joinType = (joinItem.join || 'INNER').toUpperCase() as ParsedJoin['type'];

  // This is a simplified extraction - real implementation would need
  // to traverse the ON clause to find the actual column references
  return {
    type: joinType,
    leftTable: '', // Would be extracted from ON clause
    rightTable: '', // Would be extracted from ON clause
    leftColumn: '',
    rightColumn: '',
  };
}

/**
 * Extract column information
 */
function extractColumn(
  col: any,
  columns: ParsedColumn[],
  isSelected: boolean,
  isJoinColumn: boolean,
  isFilterColumn: boolean,
  isModified: boolean
): void {
  if (col.expr?.type === 'ref') {
    columns.push({
      name: col.expr.name,
      table: col.expr.table?.name,
      alias: col.alias?.name,
      isSelected,
      isJoinColumn,
      isFilterColumn,
      isModified,
    });
  } else if (col.type === 'ref') {
    columns.push({
      name: col.name,
      table: col.table?.name,
      isSelected,
      isJoinColumn,
      isFilterColumn,
      isModified,
    });
  }
}

/**
 * Extract WHERE conditions and referenced columns
 */
function extractWhereConditions(
  where: any,
  conditions: string[],
  columns: ParsedColumn[]
): void {
  // Simplified - would need recursive traversal for complex conditions
  if (where.type === 'binary') {
    if (where.left?.type === 'ref') {
      columns.push({
        name: where.left.name,
        table: where.left.table?.name,
        isSelected: false,
        isJoinColumn: false,
        isFilterColumn: true,
        isModified: false,
      });
    }
  }
}

/**
 * Validate SQL syntax without full parsing
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
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
