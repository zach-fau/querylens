/**
 * Schema Validation Tests
 *
 * Tests for validating SQL queries against a schema.
 * This verifies that column validation works correctly.
 */

import { describe, it, expect } from 'vitest';
import { parseSQL } from '@/lib/sql-parser';
import { parseDDL } from '@/lib/schema-parser';

describe('Schema Validation', () => {
  // Set up a test schema
  const testDDL = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      total NUMERIC(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending'
    );

    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT
    );
  `;

  const schemaResult = parseDDL(testDDL);
  const schema = schemaResult.schema!;

  describe('Valid Columns', () => {
    it('should mark valid columns as isValid=true', () => {
      const sql = 'SELECT u.id, u.name, u.email FROM users u';
      const result = parseSQL(sql, schema);

      const validColumns = result.columns.filter(c => c.isValid === true);
      expect(validColumns.length).toBeGreaterThanOrEqual(3);

      const idCol = result.columns.find(c => c.name === 'id');
      const nameCol = result.columns.find(c => c.name === 'name');
      const emailCol = result.columns.find(c => c.name === 'email');

      expect(idCol?.isValid).toBe(true);
      expect(nameCol?.isValid).toBe(true);
      expect(emailCol?.isValid).toBe(true);
    });

    it('should add data types from schema', () => {
      const sql = 'SELECT u.id, u.name, u.email FROM users u';
      const result = parseSQL(sql, schema);

      const idCol = result.columns.find(c => c.name === 'id');
      const nameCol = result.columns.find(c => c.name === 'name');
      const emailCol = result.columns.find(c => c.name === 'email');

      expect(idCol?.dataType).toBe('SERIAL');
      expect(nameCol?.dataType).toBe('VARCHAR(255)');
      expect(emailCol?.dataType).toBe('VARCHAR(255)');
    });

    it('should handle table aliases correctly', () => {
      const sql = `
        SELECT u.id, u.name, o.total
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql, schema);

      // All columns should be valid
      const invalidColumns = result.columns.filter(c => c.isValid === false);
      expect(invalidColumns.length).toBe(0);

      // Check data types are set
      const totalCol = result.columns.find(c => c.name === 'total');
      expect(totalCol?.dataType).toBe('NUMERIC(10,2)');
    });
  });

  describe('Invalid Columns', () => {
    it('should mark non-existent columns as isValid=false', () => {
      const sql = 'SELECT u.id, u.nonexistent_column FROM users u';
      const result = parseSQL(sql, schema);

      const invalidCol = result.columns.find(c => c.name === 'nonexistent_column');
      expect(invalidCol?.isValid).toBe(false);
      expect(invalidCol?.dataType).toBeUndefined();
    });

    it('should mark columns from wrong table as invalid', () => {
      const sql = 'SELECT u.id, u.total FROM users u'; // total is in orders, not users
      const result = parseSQL(sql, schema);

      const totalCol = result.columns.find(c => c.name === 'total');
      expect(totalCol?.isValid).toBe(false);
    });

    it('should mark multiple invalid columns', () => {
      const sql = 'SELECT u.id, u.foo, u.bar, u.baz FROM users u';
      const result = parseSQL(sql, schema);

      const invalidColumns = result.columns.filter(c => c.isValid === false);
      expect(invalidColumns.length).toBe(3);
      expect(invalidColumns.map(c => c.name).sort()).toEqual(['bar', 'baz', 'foo']);
    });
  });

  describe('Mixed Valid/Invalid Columns', () => {
    it('should correctly identify valid and invalid columns', () => {
      const sql = 'SELECT u.id, u.name, u.fake_column FROM users u';
      const result = parseSQL(sql, schema);

      const idCol = result.columns.find(c => c.name === 'id');
      const nameCol = result.columns.find(c => c.name === 'name');
      const fakeCol = result.columns.find(c => c.name === 'fake_column');

      expect(idCol?.isValid).toBe(true);
      expect(nameCol?.isValid).toBe(true);
      expect(fakeCol?.isValid).toBe(false);
    });

    it('should handle JOIN with mixed valid/invalid columns', () => {
      const sql = `
        SELECT u.id, u.name, o.total, o.invalid_col
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql, schema);

      const validColumns = result.columns.filter(c => c.isValid === true);
      const invalidColumns = result.columns.filter(c => c.isValid === false);

      expect(validColumns.length).toBeGreaterThanOrEqual(3);
      expect(invalidColumns.length).toBe(1);
      expect(invalidColumns[0].name).toBe('invalid_col');
    });
  });

  describe('Tables Not In Schema', () => {
    it('should leave isValid undefined for columns from unknown tables', () => {
      const sql = 'SELECT u.id, x.something FROM users u INNER JOIN unknown_table x ON u.id = x.user_id';
      const result = parseSQL(sql, schema);

      // users columns should be validated
      const idCol = result.columns.find(c => c.name === 'id' && c.table === 'users');
      expect(idCol?.isValid).toBe(true);

      // unknown_table columns should have undefined isValid
      // Since the table doesn't exist in schema, isValid should be undefined (not validated)
      const unknownTableCols = result.columns.filter(c => c.table === 'unknown_table' || c.table === 'x');
      expect(unknownTableCols.every(c => c.isValid === undefined)).toBe(true);
    });
  });

  describe('Parsing Without Schema', () => {
    it('should not set isValid when no schema provided', () => {
      const sql = 'SELECT u.id, u.name FROM users u';
      const result = parseSQL(sql); // No schema

      const idCol = result.columns.find(c => c.name === 'id');
      expect(idCol?.isValid).toBeUndefined();
      expect(idCol?.dataType).toBeUndefined();
    });
  });

  describe('Complex Queries with Schema', () => {
    it('should validate columns in WHERE clause', () => {
      const sql = "SELECT u.id FROM users u WHERE u.email = 'test@example.com' AND u.fake_field > 10";
      const result = parseSQL(sql, schema);

      const emailCol = result.columns.find(c => c.name === 'email');
      const fakeCol = result.columns.find(c => c.name === 'fake_field');

      expect(emailCol?.isValid).toBe(true);
      expect(fakeCol?.isValid).toBe(false);
    });

    it('should validate columns in JOIN conditions', () => {
      const sql = `
        SELECT u.name, o.total
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
      `;
      const result = parseSQL(sql, schema);

      // Join columns should be validated
      const userIdCol = result.columns.find(c => c.name === 'user_id');
      expect(userIdCol?.isValid).toBe(true);
      expect(userIdCol?.dataType).toBe('INT');
    });

    it('should validate columns in three-way JOIN', () => {
      const sql = `
        SELECT u.name, o.total, p.price
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        INNER JOIN products p ON o.id = p.id
      `;
      const result = parseSQL(sql, schema);

      // All columns should be valid
      const nameCol = result.columns.find(c => c.name === 'name' && c.table === 'users');
      const totalCol = result.columns.find(c => c.name === 'total');
      const priceCol = result.columns.find(c => c.name === 'price');

      expect(nameCol?.isValid).toBe(true);
      expect(totalCol?.isValid).toBe(true);
      expect(priceCol?.isValid).toBe(true);
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle case-insensitive column matching', () => {
      const sql = 'SELECT u.ID, u.NAME, u.Email FROM users u';
      const result = parseSQL(sql, schema);

      // All should be valid regardless of case
      const columns = result.columns.filter(c => c.isSelected);
      const validCount = columns.filter(c => c.isValid === true).length;
      expect(validCount).toBe(3);
    });
  });
});
