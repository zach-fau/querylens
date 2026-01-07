/**
 * Schema Parser Module
 *
 * Parses PostgreSQL DDL (CREATE TABLE statements) and extracts
 * structured schema information for query validation.
 */

import { parse } from 'pgsql-ast-parser';

// ==================== Schema Types ====================

/**
 * Represents a column in a table schema
 */
export interface ColumnSchema {
  /** Column name */
  name: string;
  /** PostgreSQL data type (normalized) */
  dataType: string;
  /** Whether the column is nullable */
  nullable: boolean;
  /** Whether this is a primary key column */
  isPrimaryKey: boolean;
  /** Whether this is a foreign key column */
  isForeignKey: boolean;
}

/**
 * Represents a table in the schema
 */
export interface TableSchema {
  /** Table name */
  name: string;
  /** Optional schema name (e.g., 'public') */
  schema?: string;
  /** Columns in this table */
  columns: ColumnSchema[];
}

/**
 * Complete database schema
 * Maps table names to their column definitions
 */
export interface Schema {
  /** All tables in the schema, keyed by table name */
  tables: Record<string, Record<string, string>>;
  /** Detailed table information */
  tableDetails: TableSchema[];
}

/**
 * Result of schema parsing
 */
export interface SchemaParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed schema (if successful) */
  schema?: Schema;
  /** Error message (if failed) */
  error?: string;
  /** Number of tables parsed */
  tableCount?: number;
}

// ==================== Type Definitions for AST Nodes ====================

// pgsql-ast-parser types are incomplete, so we define what we need
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = Record<string, any>;
type Statement = ASTNode & { type?: string };
type CreateTableStatement = Statement & {
  name?: { name?: string; schema?: string };
  columns?: CreateColumnDef[];
  constraints?: TableConstraint[];
};
type CreateColumnDef = ASTNode & {
  kind?: string;
  name?: string | { name?: string };
  dataType?: DataType;
  constraints?: ColumnConstraint[];
};
type DataType = ASTNode & {
  name?: string;
  length?: number;
  precision?: number;
  scale?: number;
  arrayOf?: DataType;
  config?: number[];
};
type ColumnConstraint = ASTNode & {
  type?: string;
  constraintName?: string;
};
type TableConstraint = ASTNode & {
  type?: string;
  constraintType?: string;
  columns?: (string | { name?: string })[];
};

// ==================== Main Parsing Functions ====================

/**
 * Parse DDL (CREATE TABLE statements) and extract schema information
 *
 * @param ddl - The DDL string containing CREATE TABLE statements
 * @returns Schema parse result with tables and columns
 */
export function parseDDL(ddl: string): SchemaParseResult {
  if (!ddl || ddl.trim().length === 0) {
    return {
      success: false,
      error: 'DDL cannot be empty',
    };
  }

  try {
    const ast = parse(ddl);

    if (!ast || ast.length === 0) {
      return {
        success: false,
        error: 'No valid SQL statements found',
      };
    }

    const tables: Record<string, Record<string, string>> = {};
    const tableDetails: TableSchema[] = [];

    for (const stmt of ast as Statement[]) {
      if (!stmt || stmt.type !== 'create table') continue;

      const tableInfo = extractTableInfo(stmt as CreateTableStatement);
      if (tableInfo) {
        tables[tableInfo.name.toLowerCase()] = {};
        for (const col of tableInfo.columns) {
          tables[tableInfo.name.toLowerCase()][col.name.toLowerCase()] = col.dataType;
        }
        tableDetails.push(tableInfo);
      }
    }

    return {
      success: true,
      schema: { tables, tableDetails },
      tableCount: tableDetails.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    return {
      success: false,
      error: `Failed to parse DDL: ${message}`,
    };
  }
}

/**
 * Validate DDL syntax without full parsing
 *
 * @param ddl - The DDL string to validate
 * @returns Validation result
 */
export function validateDDL(ddl: string): { valid: boolean; error?: string } {
  if (!ddl || ddl.trim().length === 0) {
    return {
      valid: false,
      error: 'DDL cannot be empty',
    };
  }

  try {
    parse(ddl);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid DDL syntax',
    };
  }
}

// ==================== Internal Processing Functions ====================

/**
 * Extract table information from CREATE TABLE statement
 */
function extractTableInfo(stmt: CreateTableStatement): TableSchema | null {
  if (!stmt.name) return null;

  const tableName = typeof stmt.name === 'string' ? stmt.name : stmt.name.name;
  const schemaName = typeof stmt.name === 'object' ? stmt.name.schema : undefined;

  if (!tableName) return null;

  const columns: ColumnSchema[] = [];
  const primaryKeyColumns = new Set<string>();

  // First pass: find table-level PRIMARY KEY constraints
  if (stmt.constraints) {
    for (const constraint of stmt.constraints) {
      if (constraint.type === 'primary key' && constraint.columns) {
        for (const col of constraint.columns) {
          const colName = typeof col === 'string' ? col : col.name;
          if (colName) {
            primaryKeyColumns.add(colName.toLowerCase());
          }
        }
      }
    }
  }

  // Second pass: extract columns
  if (stmt.columns) {
    for (const col of stmt.columns) {
      if (col.kind !== 'column') continue;

      const colName = typeof col.name === 'string' ? col.name : col.name?.name;
      if (!colName) continue;

      const dataType = normalizeDataType(col.dataType);
      let nullable = true;
      let isPrimaryKey = primaryKeyColumns.has(colName.toLowerCase());
      let isForeignKey = false;

      // Check column-level constraints
      if (col.constraints) {
        for (const constraint of col.constraints) {
          if (constraint.type === 'not null') {
            nullable = false;
          } else if (constraint.type === 'primary key') {
            isPrimaryKey = true;
            nullable = false;
          } else if (constraint.type === 'reference') {
            isForeignKey = true;
          }
        }
      }

      // Primary key columns are not nullable
      if (isPrimaryKey) {
        nullable = false;
      }

      columns.push({
        name: colName,
        dataType,
        nullable,
        isPrimaryKey,
        isForeignKey,
      });
    }
  }

  return {
    name: tableName,
    schema: schemaName,
    columns,
  };
}

/**
 * Normalize PostgreSQL data type to a readable string
 */
function normalizeDataType(dataType: DataType | undefined): string {
  if (!dataType) return 'unknown';

  const typeName = dataType.name?.toLowerCase() || 'unknown';

  // Handle array types
  if (dataType.arrayOf) {
    return `${normalizeDataType(dataType.arrayOf)}[]`;
  }

  // Common type mappings
  const typeMap: Record<string, string> = {
    'int': 'INT',
    'int2': 'SMALLINT',
    'int4': 'INT',
    'int8': 'BIGINT',
    'integer': 'INT',
    'smallint': 'SMALLINT',
    'bigint': 'BIGINT',
    'serial': 'SERIAL',
    'serial4': 'SERIAL',
    'serial8': 'BIGSERIAL',
    'bigserial': 'BIGSERIAL',
    'float4': 'REAL',
    'float8': 'DOUBLE PRECISION',
    'real': 'REAL',
    'double precision': 'DOUBLE PRECISION',
    'numeric': formatNumeric(dataType),
    'decimal': formatNumeric(dataType),
    'varchar': formatVarchar(dataType),
    'character varying': formatVarchar(dataType),
    'char': formatChar(dataType),
    'character': formatChar(dataType),
    'text': 'TEXT',
    'bool': 'BOOLEAN',
    'boolean': 'BOOLEAN',
    'date': 'DATE',
    'time': formatTime(dataType),
    'timestamp': formatTimestamp(dataType),
    'timestamptz': 'TIMESTAMPTZ',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'timestamp without time zone': 'TIMESTAMP',
    'timetz': 'TIMETZ',
    'time with time zone': 'TIMETZ',
    'time without time zone': 'TIME',
    'interval': 'INTERVAL',
    'uuid': 'UUID',
    'json': 'JSON',
    'jsonb': 'JSONB',
    'bytea': 'BYTEA',
    'inet': 'INET',
    'cidr': 'CIDR',
    'macaddr': 'MACADDR',
    'money': 'MONEY',
    'xml': 'XML',
    'point': 'POINT',
    'line': 'LINE',
    'box': 'BOX',
    'path': 'PATH',
    'polygon': 'POLYGON',
    'circle': 'CIRCLE',
  };

  return typeMap[typeName] || typeName.toUpperCase();
}

/**
 * Format VARCHAR type with optional length
 */
function formatVarchar(dataType: DataType): string {
  // pgsql-ast-parser uses config array for length
  if (dataType.config && dataType.config.length > 0) {
    return `VARCHAR(${dataType.config[0]})`;
  }
  if (dataType.length) {
    return `VARCHAR(${dataType.length})`;
  }
  return 'VARCHAR';
}

/**
 * Format CHAR type with optional length
 */
function formatChar(dataType: DataType): string {
  // pgsql-ast-parser uses config array for length
  if (dataType.config && dataType.config.length > 0) {
    return `CHAR(${dataType.config[0]})`;
  }
  if (dataType.length) {
    return `CHAR(${dataType.length})`;
  }
  return 'CHAR';
}

/**
 * Format NUMERIC type with optional precision and scale
 */
function formatNumeric(dataType: DataType): string {
  // pgsql-ast-parser uses config array for precision and scale
  if (dataType.config && dataType.config.length > 0) {
    if (dataType.config.length >= 2) {
      return `NUMERIC(${dataType.config[0]},${dataType.config[1]})`;
    }
    return `NUMERIC(${dataType.config[0]})`;
  }
  if (dataType.precision !== undefined) {
    if (dataType.scale !== undefined) {
      return `NUMERIC(${dataType.precision},${dataType.scale})`;
    }
    return `NUMERIC(${dataType.precision})`;
  }
  return 'NUMERIC';
}

/**
 * Format TIME type
 */
function formatTime(dataType: DataType): string {
  if (dataType.config && dataType.config.length > 0) {
    return `TIME(${dataType.config[0]})`;
  }
  if (dataType.precision !== undefined) {
    return `TIME(${dataType.precision})`;
  }
  return 'TIME';
}

/**
 * Format TIMESTAMP type
 */
function formatTimestamp(dataType: DataType): string {
  if (dataType.config && dataType.config.length > 0) {
    return `TIMESTAMP(${dataType.config[0]})`;
  }
  if (dataType.precision !== undefined) {
    return `TIMESTAMP(${dataType.precision})`;
  }
  return 'TIMESTAMP';
}

// ==================== Schema Lookup Functions ====================

/**
 * Look up a column in the schema
 *
 * @param schema - The parsed schema
 * @param tableName - Name of the table
 * @param columnName - Name of the column
 * @returns Column data type if found, undefined otherwise
 */
export function lookupColumn(
  schema: Schema,
  tableName: string,
  columnName: string
): string | undefined {
  const table = schema.tables[tableName.toLowerCase()];
  if (!table) return undefined;
  return table[columnName.toLowerCase()];
}

/**
 * Check if a table exists in the schema
 *
 * @param schema - The parsed schema
 * @param tableName - Name of the table
 * @returns true if table exists
 */
export function tableExists(schema: Schema, tableName: string): boolean {
  return tableName.toLowerCase() in schema.tables;
}

/**
 * Check if a column exists in a table
 *
 * @param schema - The parsed schema
 * @param tableName - Name of the table
 * @param columnName - Name of the column
 * @returns true if column exists in the table
 */
export function columnExists(
  schema: Schema,
  tableName: string,
  columnName: string
): boolean {
  return lookupColumn(schema, tableName, columnName) !== undefined;
}

/**
 * Get all columns for a table
 *
 * @param schema - The parsed schema
 * @param tableName - Name of the table
 * @returns Record of column names to data types, or empty object if table not found
 */
export function getTableColumns(
  schema: Schema,
  tableName: string
): Record<string, string> {
  return schema.tables[tableName.toLowerCase()] || {};
}
