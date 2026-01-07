/**
 * Test Utilities for QueryLens
 *
 * Provides sample SQL queries, mock data generators, and test helpers
 * for consistent testing across the codebase.
 */

import type {
  ParsedQuery,
  ParsedTable,
  ParsedColumn,
  ParsedJoin,
  DiagramData,
  DiagramNode,
  DiagramEdge,
  Schema,
  AIExplanation,
} from '@/types';
import { QueryType, JoinType, ColumnRole } from '@/types';

// ==================== Sample SQL Queries ====================

/**
 * Simple SELECT query with no joins.
 * Good for basic parser testing.
 */
export const SAMPLE_SIMPLE_SELECT = `
SELECT id, name, email
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;
`.trim();

/**
 * SELECT with INNER JOIN.
 * Tests basic join parsing and column tracking.
 */
export const SAMPLE_INNER_JOIN = `
SELECT
  u.id,
  u.name,
  o.order_id,
  o.total_amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC;
`.trim();

/**
 * SELECT with multiple joins (LEFT and INNER).
 * Tests complex join relationships and alias handling.
 */
export const SAMPLE_MULTIPLE_JOINS = `
SELECT
  u.id AS user_id,
  u.name,
  u.email,
  o.order_id,
  o.total_amount,
  p.product_name,
  p.price
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE u.active = true
  AND o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC;
`.trim();

/**
 * SELECT with Common Table Expression (CTE).
 * Tests WITH clause parsing.
 */
export const SAMPLE_WITH_CTE = `
WITH active_users AS (
  SELECT id, name, email
  FROM users
  WHERE active = true
),
recent_orders AS (
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT
  au.id,
  au.name,
  au.email,
  COALESCE(ro.order_count, 0) as orders_last_30_days
FROM active_users au
LEFT JOIN recent_orders ro ON au.id = ro.user_id
ORDER BY ro.order_count DESC NULLS LAST;
`.trim();

/**
 * INSERT statement.
 * Tests DML parsing.
 */
export const SAMPLE_INSERT = `
INSERT INTO users (name, email, active, created_at)
VALUES ('John Doe', 'john@example.com', true, CURRENT_TIMESTAMP);
`.trim();

/**
 * UPDATE statement with WHERE clause.
 * Tests modification tracking.
 */
export const SAMPLE_UPDATE = `
UPDATE users
SET active = false, updated_at = CURRENT_TIMESTAMP
WHERE last_login < CURRENT_DATE - INTERVAL '1 year';
`.trim();

/**
 * DELETE statement.
 * Tests simple delete parsing.
 */
export const SAMPLE_DELETE = `
DELETE FROM users
WHERE active = false
  AND created_at < CURRENT_DATE - INTERVAL '2 years';
`.trim();

/**
 * Complex query with subquery.
 * Tests nested query handling.
 */
export const SAMPLE_SUBQUERY = `
SELECT
  u.id,
  u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as total_orders
FROM users u
WHERE u.id IN (
  SELECT DISTINCT user_id
  FROM orders
  WHERE total_amount > 1000
)
ORDER BY u.name;
`.trim();

/**
 * All sample queries in a collection for easy testing.
 */
export const SAMPLE_QUERIES = {
  simple: SAMPLE_SIMPLE_SELECT,
  innerJoin: SAMPLE_INNER_JOIN,
  multipleJoins: SAMPLE_MULTIPLE_JOINS,
  cte: SAMPLE_WITH_CTE,
  insert: SAMPLE_INSERT,
  update: SAMPLE_UPDATE,
  delete: SAMPLE_DELETE,
  subquery: SAMPLE_SUBQUERY,
} as const;

// ==================== Expected Parse Results ====================

/**
 * Expected parse result for SAMPLE_SIMPLE_SELECT.
 * Use this to validate parser output.
 */
export const EXPECTED_SIMPLE_SELECT: ParsedQuery = {
  type: QueryType.SELECT,
  tables: [
    {
      name: 'users',
    },
  ],
  columns: [
    {
      name: 'id',
      table: 'users',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'name',
      table: 'users',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'email',
      table: 'users',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'active',
      table: 'users',
      isSelected: false,
      isJoinColumn: false,
      isFilterColumn: true,
      isModified: false,
    },
  ],
  joins: [],
  whereConditions: ['active = true'],
  ctes: [],
  subqueries: [],
  rawSql: SAMPLE_SIMPLE_SELECT,
};

/**
 * Expected parse result for SAMPLE_INNER_JOIN.
 */
export const EXPECTED_INNER_JOIN: ParsedQuery = {
  type: QueryType.SELECT,
  tables: [
    {
      name: 'users',
      alias: 'u',
    },
    {
      name: 'orders',
      alias: 'o',
    },
  ],
  columns: [
    {
      name: 'id',
      table: 'u',
      isSelected: true,
      isJoinColumn: true,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'name',
      table: 'u',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'order_id',
      table: 'o',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'total_amount',
      table: 'o',
      isSelected: true,
      isJoinColumn: false,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'user_id',
      table: 'o',
      isSelected: false,
      isJoinColumn: true,
      isFilterColumn: false,
      isModified: false,
    },
    {
      name: 'status',
      table: 'o',
      isSelected: false,
      isJoinColumn: false,
      isFilterColumn: true,
      isModified: false,
    },
  ],
  joins: [
    {
      type: JoinType.INNER,
      leftTable: 'u',
      rightTable: 'o',
      leftColumn: 'id',
      rightColumn: 'user_id',
    },
  ],
  whereConditions: ["status = 'completed'"],
  ctes: [],
  subqueries: [],
  rawSql: SAMPLE_INNER_JOIN,
};

// ==================== Mock Data Generators ====================

/**
 * Create a mock ParsedTable with defaults.
 */
export function createMockTable(overrides?: Partial<ParsedTable>): ParsedTable {
  return {
    name: 'mock_table',
    ...overrides,
  };
}

/**
 * Create a mock ParsedColumn with defaults.
 */
export function createMockColumn(overrides?: Partial<ParsedColumn>): ParsedColumn {
  return {
    name: 'mock_column',
    table: 'mock_table',
    isSelected: false,
    isJoinColumn: false,
    isFilterColumn: false,
    isModified: false,
    ...overrides,
  };
}

/**
 * Create a mock ParsedJoin with defaults.
 */
export function createMockJoin(overrides?: Partial<ParsedJoin>): ParsedJoin {
  return {
    type: JoinType.INNER,
    leftTable: 'table_a',
    rightTable: 'table_b',
    leftColumn: 'id',
    rightColumn: 'table_a_id',
    ...overrides,
  };
}

/**
 * Create a mock ParsedQuery with defaults.
 */
export function createMockParsedQuery(
  overrides?: Partial<ParsedQuery>
): ParsedQuery {
  return {
    type: QueryType.SELECT,
    tables: [createMockTable()],
    columns: [createMockColumn()],
    joins: [],
    whereConditions: [],
    ctes: [],
    subqueries: [],
    rawSql: 'SELECT * FROM mock_table',
    ...overrides,
  };
}

/**
 * Create a mock DiagramNode with defaults.
 */
export function createMockDiagramNode(overrides?: Partial<DiagramNode>): DiagramNode {
  return {
    id: 'node-1',
    type: 'table',
    position: { x: 0, y: 0 },
    data: {
      tableName: 'mock_table',
      columns: [
        {
          name: 'id',
          role: ColumnRole.SELECTED,
          dataType: 'integer',
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create a mock DiagramEdge with defaults.
 */
export function createMockDiagramEdge(overrides?: Partial<DiagramEdge>): DiagramEdge {
  return {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'join',
    data: {
      joinType: JoinType.INNER,
      leftColumn: 'id',
      rightColumn: 'table_id',
      label: 'INNER JOIN',
    },
    ...overrides,
  };
}

/**
 * Create mock DiagramData with defaults.
 */
export function createMockDiagramData(
  overrides?: Partial<DiagramData>
): DiagramData {
  return {
    nodes: [createMockDiagramNode()],
    edges: [],
    ...overrides,
  };
}

/**
 * Create a mock Schema with sample tables.
 */
export function createMockSchema(overrides?: Partial<Schema>): Schema {
  return {
    tables: [
      {
        name: 'users',
        columns: [
          {
            name: 'id',
            dataType: 'integer',
            nullable: false,
            isPrimaryKey: true,
            isForeignKey: false,
          },
          {
            name: 'name',
            dataType: 'varchar(255)',
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: 'email',
            dataType: 'varchar(255)',
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
      {
        name: 'orders',
        columns: [
          {
            name: 'order_id',
            dataType: 'integer',
            nullable: false,
            isPrimaryKey: true,
            isForeignKey: false,
          },
          {
            name: 'user_id',
            dataType: 'integer',
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: true,
            references: {
              table: 'users',
              column: 'id',
            },
          },
          {
            name: 'total_amount',
            dataType: 'numeric(10,2)',
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

/**
 * Create a mock AIExplanation with defaults.
 */
export function createMockAIExplanation(
  overrides?: Partial<AIExplanation>
): AIExplanation {
  return {
    summary: 'This query retrieves user data from the database.',
    stepByStep: [
      'Query starts by scanning the users table',
      'Filters rows where active = true',
      'Returns id, name, and email columns',
    ],
    joinExplanations: [],
    potentialIssues: [],
    dataFlowDescription: 'Data flows from users table through WHERE filter to SELECT output.',
    complexity: 'simple',
    ...overrides,
  };
}

// ==================== Test Helpers ====================

/**
 * Check if two ParsedTable objects are equal.
 */
export function tablesEqual(a: ParsedTable, b: ParsedTable): boolean {
  return (
    a.name === b.name &&
    a.alias === b.alias &&
    a.schema === b.schema
  );
}

/**
 * Check if two ParsedColumn objects are equal.
 */
export function columnsEqual(a: ParsedColumn, b: ParsedColumn): boolean {
  return (
    a.name === b.name &&
    a.table === b.table &&
    a.alias === b.alias &&
    a.isSelected === b.isSelected &&
    a.isJoinColumn === b.isJoinColumn &&
    a.isFilterColumn === b.isFilterColumn &&
    a.isModified === b.isModified
  );
}

/**
 * Check if two ParsedJoin objects are equal.
 */
export function joinsEqual(a: ParsedJoin, b: ParsedJoin): boolean {
  return (
    a.type === b.type &&
    a.leftTable === b.leftTable &&
    a.rightTable === b.rightTable &&
    a.leftColumn === b.leftColumn &&
    a.rightColumn === b.rightColumn
  );
}

/**
 * Find a table by name in a ParsedQuery.
 */
export function findTable(
  query: ParsedQuery,
  name: string
): ParsedTable | undefined {
  return query.tables.find((t) => t.name === name || t.alias === name);
}

/**
 * Find columns by table name in a ParsedQuery.
 */
export function findColumnsByTable(
  query: ParsedQuery,
  tableName: string
): ParsedColumn[] {
  return query.columns.filter((c) => c.table === tableName);
}

/**
 * Count columns by role in a ParsedQuery.
 */
export function countColumnsByRole(
  query: ParsedQuery,
  role: 'selected' | 'join' | 'filter' | 'modified'
): number {
  const key = `is${role.charAt(0).toUpperCase() + role.slice(1)}Column` as
    | 'isSelected'
    | 'isJoinColumn'
    | 'isFilterColumn'
    | 'isModified';

  return query.columns.filter((c) => c[key]).length;
}

/**
 * Assert that a ParsedQuery has expected table count.
 */
export function assertTableCount(query: ParsedQuery, expected: number): void {
  if (query.tables.length !== expected) {
    throw new Error(
      `Expected ${expected} tables, got ${query.tables.length}`
    );
  }
}

/**
 * Assert that a ParsedQuery has expected column count.
 */
export function assertColumnCount(query: ParsedQuery, expected: number): void {
  if (query.columns.length !== expected) {
    throw new Error(
      `Expected ${expected} columns, got ${query.columns.length}`
    );
  }
}

/**
 * Assert that a ParsedQuery has expected join count.
 */
export function assertJoinCount(query: ParsedQuery, expected: number): void {
  if (query.joins.length !== expected) {
    throw new Error(
      `Expected ${expected} joins, got ${query.joins.length}`
    );
  }
}

/**
 * Pretty print a ParsedQuery for debugging.
 */
export function debugParsedQuery(query: ParsedQuery): string {
  return JSON.stringify(query, null, 2);
}

/**
 * Pretty print a DiagramData for debugging.
 */
export function debugDiagramData(data: DiagramData): string {
  return JSON.stringify(data, null, 2);
}
