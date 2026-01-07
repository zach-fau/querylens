/**
 * SQL Parser Tests
 *
 * Comprehensive tests for the SQL parser module covering:
 * - Simple SELECT queries
 * - JOINs (INNER, LEFT, RIGHT, FULL)
 * - Table and column aliases
 * - WHERE conditions
 * - INSERT, UPDATE, DELETE statements
 * - CTEs (WITH clauses)
 * - Error handling
 */

import { describe, it, expect } from 'vitest';
import {
  parseSQL,
  validateSQL,
  extractTables,
  extractColumns,
  extractJoins,
} from '@/lib/sql-parser';

describe('SQL Parser', () => {
  describe('validateSQL', () => {
    it('should validate correct SQL', () => {
      const result = validateSQL('SELECT * FROM users');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty SQL', () => {
      const result = validateSQL('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject invalid SQL syntax', () => {
      const result = validateSQL('SELECT FROM WHERE');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate SQL with whitespace', () => {
      const result = validateSQL('  \n  SELECT * FROM users  \n  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('parseSQL - Basic SELECT', () => {
    it('should parse simple SELECT *', () => {
      const sql = 'SELECT * FROM users';
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');
      expect(result.rawSql).toBe(sql);
    });

    it('should parse SELECT with specific columns', () => {
      const sql = 'SELECT id, name, email FROM users';
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.columns.length).toBeGreaterThanOrEqual(3);

      const selectedColumns = result.columns.filter(c => c.isSelected);
      expect(selectedColumns.length).toBeGreaterThanOrEqual(3);

      const names = selectedColumns.map(c => c.name);
      expect(names).toContain('id');
      expect(names).toContain('name');
      expect(names).toContain('email');
    });

    it('should parse SELECT with table.column notation', () => {
      const sql = 'SELECT users.id, users.name FROM users';
      const result = parseSQL(sql);

      expect(result.columns.length).toBeGreaterThanOrEqual(2);
      const selectedCols = result.columns.filter(c => c.isSelected);
      expect(selectedCols.every(c => c.table === 'users')).toBe(true);
    });

    it('should throw error for empty SQL', () => {
      expect(() => parseSQL('')).toThrow('empty');
    });

    it('should throw error for invalid SQL', () => {
      expect(() => parseSQL('INVALID SQL STATEMENT')).toThrow('Failed to parse SQL');
    });
  });

  describe('parseSQL - Aliases', () => {
    it('should handle table aliases', () => {
      const sql = 'SELECT u.id, u.name FROM users AS u';
      const result = parseSQL(sql);

      expect(result.tables[0].name).toBe('users');
      expect(result.tables[0].alias).toBe('u');

      const selectedCols = result.columns.filter(c => c.isSelected);
      expect(selectedCols.every(c => c.table === 'users')).toBe(true);
    });

    it('should handle table aliases without AS keyword', () => {
      const sql = 'SELECT u.id, u.name FROM users u';
      const result = parseSQL(sql);

      expect(result.tables[0].name).toBe('users');
      expect(result.tables[0].alias).toBe('u');
    });

    it('should handle column aliases', () => {
      const sql = 'SELECT name AS user_name, email AS user_email FROM users';
      const result = parseSQL(sql);

      const nameCol = result.columns.find(c => c.name === 'name');
      const emailCol = result.columns.find(c => c.name === 'email');

      expect(nameCol?.alias).toBe('user_name');
      expect(emailCol?.alias).toBe('user_email');
    });

    it('should handle column aliases without AS keyword', () => {
      const sql = 'SELECT name user_name, email user_email FROM users';
      const result = parseSQL(sql);

      const nameCol = result.columns.find(c => c.name === 'name');
      const emailCol = result.columns.find(c => c.name === 'email');

      expect(nameCol?.alias).toBe('user_name');
      expect(emailCol?.alias).toBe('user_email');
    });
  });

  describe('parseSQL - JOINs', () => {
    it('should parse INNER JOIN', () => {
      const sql = `
        SELECT u.id, u.name, o.order_id
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql);

      expect(result.tables).toHaveLength(2);
      expect(result.tables.map(t => t.name)).toContain('users');
      expect(result.tables.map(t => t.name)).toContain('orders');

      expect(result.joins).toHaveLength(1);
      expect(result.joins[0].type).toBe('INNER');
      expect(result.joins[0].leftTable).toBe('users');
      expect(result.joins[0].rightTable).toBe('orders');
      expect(result.joins[0].leftColumn).toBe('id');
      expect(result.joins[0].rightColumn).toBe('user_id');
    });

    it('should parse LEFT JOIN', () => {
      const sql = `
        SELECT u.id, u.name, p.phone
        FROM users u
        LEFT JOIN phones p ON u.id = p.user_id
      `;
      const result = parseSQL(sql);

      expect(result.joins).toHaveLength(1);
      expect(result.joins[0].type).toBe('LEFT');
    });

    it('should parse RIGHT JOIN', () => {
      const sql = `
        SELECT u.id, o.order_id
        FROM users u
        RIGHT JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql);

      expect(result.joins).toHaveLength(1);
      expect(result.joins[0].type).toBe('RIGHT');
    });

    it('should parse FULL OUTER JOIN', () => {
      const sql = `
        SELECT u.id, o.order_id
        FROM users u
        FULL OUTER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql);

      expect(result.joins).toHaveLength(1);
      expect(result.joins[0].type).toBe('FULL');
    });

    it('should parse multiple JOINs', () => {
      const sql = `
        SELECT u.name, o.order_id, p.product_name
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        INNER JOIN products p ON o.product_id = p.id
      `;
      const result = parseSQL(sql);

      expect(result.tables).toHaveLength(3);
      expect(result.joins).toHaveLength(2);
    });

    it('should mark join columns correctly', () => {
      const sql = `
        SELECT u.name, o.order_id
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql);

      const joinCols = result.columns.filter(c => c.isJoinColumn);
      expect(joinCols.length).toBeGreaterThanOrEqual(2);

      const colNames = joinCols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('user_id');
    });
  });

  describe('parseSQL - WHERE Conditions', () => {
    it('should extract WHERE conditions', () => {
      const sql = "SELECT * FROM users WHERE status = 'active'";
      const result = parseSQL(sql);

      expect(result.whereConditions.length).toBeGreaterThan(0);
      expect(result.whereConditions[0]).toContain('status');
      expect(result.whereConditions[0]).toContain('active');
    });

    it('should mark filter columns', () => {
      const sql = "SELECT name FROM users WHERE age > 18 AND status = 'active'";
      const result = parseSQL(sql);

      const filterCols = result.columns.filter(c => c.isFilterColumn);
      expect(filterCols.length).toBeGreaterThanOrEqual(2);

      const colNames = filterCols.map(c => c.name);
      expect(colNames).toContain('age');
      expect(colNames).toContain('status');
    });

    it('should handle complex WHERE with AND/OR', () => {
      const sql = `
        SELECT * FROM users
        WHERE (age > 18 AND status = 'active')
           OR (role = 'admin')
      `;
      const result = parseSQL(sql);

      const filterCols = result.columns.filter(c => c.isFilterColumn);
      expect(filterCols.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('parseSQL - Column Roles', () => {
    it('should distinguish between selected and filter columns', () => {
      const sql = "SELECT name, email FROM users WHERE id = 1";
      const result = parseSQL(sql);

      const selectedCols = result.columns.filter(c => c.isSelected);
      const filterCols = result.columns.filter(c => c.isFilterColumn);

      expect(selectedCols.map(c => c.name)).toContain('name');
      expect(selectedCols.map(c => c.name)).toContain('email');
      expect(filterCols.map(c => c.name)).toContain('id');
    });

    it('should mark column with multiple roles', () => {
      const sql = `
        SELECT u.id, u.name
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        WHERE u.id > 100
      `;
      const result = parseSQL(sql);

      // The 'id' column is selected, used in join, and filtered
      const idCol = result.columns.find(c => c.name === 'id' && c.table === 'users');
      expect(idCol).toBeDefined();
      expect(idCol?.isSelected).toBe(true);
      expect(idCol?.isJoinColumn).toBe(true);
      expect(idCol?.isFilterColumn).toBe(true);
    });
  });

  describe('parseSQL - INSERT', () => {
    it('should parse INSERT statement', () => {
      const sql = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')";
      const result = parseSQL(sql);

      expect(result.type).toBe('INSERT');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');

      const modifiedCols = result.columns.filter(c => c.isModified);
      expect(modifiedCols.length).toBe(2);
      expect(modifiedCols.map(c => c.name)).toContain('name');
      expect(modifiedCols.map(c => c.name)).toContain('email');
    });
  });

  describe('parseSQL - UPDATE', () => {
    it('should parse UPDATE statement', () => {
      const sql = "UPDATE users SET name = 'Jane', status = 'inactive' WHERE id = 1";
      const result = parseSQL(sql);

      expect(result.type).toBe('UPDATE');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');

      const modifiedCols = result.columns.filter(c => c.isModified);
      expect(modifiedCols.length).toBe(2);
      expect(modifiedCols.map(c => c.name)).toContain('name');
      expect(modifiedCols.map(c => c.name)).toContain('status');

      const filterCols = result.columns.filter(c => c.isFilterColumn);
      expect(filterCols.map(c => c.name)).toContain('id');
    });
  });

  describe('parseSQL - DELETE', () => {
    it('should parse DELETE statement', () => {
      const sql = "DELETE FROM users WHERE status = 'inactive'";
      const result = parseSQL(sql);

      expect(result.type).toBe('DELETE');
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');

      const filterCols = result.columns.filter(c => c.isFilterColumn);
      expect(filterCols.map(c => c.name)).toContain('status');
    });
  });

  describe('parseSQL - CTE (WITH)', () => {
    it('should parse simple CTE', () => {
      const sql = `
        WITH active_users AS (
          SELECT id, name FROM users WHERE status = 'active'
        )
        SELECT * FROM active_users
      `;
      const result = parseSQL(sql);

      expect(result.type).toBe('CTE');
      expect(result.ctes).toHaveLength(1);
      expect(result.ctes[0].type).toBe('SELECT');

      // The CTE should be available as a virtual table
      expect(result.tables.map(t => t.name)).toContain('active_users');
    });
  });

  describe('extractTables', () => {
    it('should extract all tables from parsed query', () => {
      const sql = `
        SELECT u.name, o.order_id
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const parsed = parseSQL(sql);
      const tables = extractTables(parsed);

      expect(tables).toHaveLength(2);
      expect(tables.map(t => t.name)).toContain('users');
      expect(tables.map(t => t.name)).toContain('orders');
      expect(tables.find(t => t.name === 'users')?.alias).toBe('u');
      expect(tables.find(t => t.name === 'orders')?.alias).toBe('o');
    });
  });

  describe('extractColumns', () => {
    it('should extract all columns with roles', () => {
      const sql = `
        SELECT u.name, u.email
        FROM users u
        WHERE u.id > 100
      `;
      const parsed = parseSQL(sql);
      const columns = extractColumns(parsed);

      expect(columns.length).toBeGreaterThanOrEqual(3);

      const selectedCols = columns.filter(c => c.isSelected);
      expect(selectedCols.map(c => c.name)).toContain('name');
      expect(selectedCols.map(c => c.name)).toContain('email');

      const filterCols = columns.filter(c => c.isFilterColumn);
      expect(filterCols.map(c => c.name)).toContain('id');
    });
  });

  describe('extractJoins', () => {
    it('should extract all join relationships', () => {
      const sql = `
        SELECT u.name, o.order_id, p.product_name
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        LEFT JOIN products p ON o.product_id = p.id
      `;
      const parsed = parseSQL(sql);
      const joins = extractJoins(parsed);

      expect(joins).toHaveLength(2);
      expect(joins[0].type).toBe('INNER');
      expect(joins[1].type).toBe('LEFT');

      expect(joins[0].leftTable).toBe('users');
      expect(joins[0].rightTable).toBe('orders');
      expect(joins[0].leftColumn).toBe('id');
      expect(joins[0].rightColumn).toBe('user_id');
    });
  });

  describe('Edge Cases', () => {
    it('should handle SQL with schema prefix', () => {
      const sql = 'SELECT * FROM public.users';
      const result = parseSQL(sql);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');
      expect(result.tables[0].schema).toBe('public');
    });

    it('should handle quoted identifiers', () => {
      const sql = 'SELECT "userId", "userName" FROM "Users"';
      const result = parseSQL(sql);

      expect(result.tables).toHaveLength(1);
      // Parser may normalize case
      const tableNames = result.tables.map(t => t.name.toLowerCase());
      expect(tableNames).toContain('users');
    });

    it('should handle SELECT with no FROM clause', () => {
      const sql = 'SELECT 1 AS one, 2 AS two';
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.tables).toHaveLength(0);
    });

    it('should handle COUNT and aggregate functions', () => {
      const sql = 'SELECT COUNT(*), MAX(age), MIN(age) FROM users';
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.tables).toHaveLength(1);
    });

    it('should handle GROUP BY and ORDER BY', () => {
      const sql = `
        SELECT status, COUNT(*)
        FROM users
        GROUP BY status
        ORDER BY status
      `;
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      const statusCols = result.columns.filter(c => c.name === 'status');
      expect(statusCols.length).toBeGreaterThan(0);
    });

    it('should handle subqueries in FROM clause', () => {
      const sql = `
        SELECT u.name
        FROM (SELECT * FROM users WHERE active = true) u
      `;
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      // Subquery should be tracked
      expect(result.subqueries.length).toBeGreaterThan(0);
    });
  });

  describe('Real-World Queries', () => {
    it('should parse e-commerce order query', () => {
      const sql = `
        SELECT
          o.id AS order_id,
          u.name AS customer_name,
          p.name AS product_name,
          o.quantity,
          o.total_price
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        INNER JOIN products p ON o.product_id = p.id
        WHERE o.created_at > '2024-01-01'
          AND o.status = 'completed'
        ORDER BY o.created_at DESC
      `;
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.tables).toHaveLength(3);
      expect(result.joins).toHaveLength(2);

      const tableNames = result.tables.map(t => t.name);
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('products');

      const selectedCols = result.columns.filter(c => c.isSelected);
      expect(selectedCols.length).toBeGreaterThanOrEqual(5);
    });

    it('should parse user analytics query', () => {
      const sql = `
        SELECT
          u.id,
          u.name,
          COUNT(o.id) AS order_count,
          SUM(o.total_price) AS total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.created_at > '2023-01-01'
        GROUP BY u.id, u.name
        HAVING COUNT(o.id) > 5
        ORDER BY total_spent DESC
      `;
      const result = parseSQL(sql);

      expect(result.type).toBe('SELECT');
      expect(result.tables).toHaveLength(2);
      expect(result.joins).toHaveLength(1);
      expect(result.joins[0].type).toBe('LEFT');
    });
  });
});
