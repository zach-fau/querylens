/**
 * Schema Parser Tests
 *
 * Tests for the DDL parser that extracts schema information
 * from CREATE TABLE statements.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDDL,
  validateDDL,
  lookupColumn,
  tableExists,
  columnExists,
  getTableColumns,
} from '@/lib/schema-parser';

describe('Schema Parser', () => {
  describe('validateDDL', () => {
    it('should validate correct DDL', () => {
      const result = validateDDL('CREATE TABLE users (id INT);');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty DDL', () => {
      const result = validateDDL('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject invalid DDL syntax', () => {
      const result = validateDDL('CREATE TABLET users');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('parseDDL - Basic Tables', () => {
    it('should parse simple CREATE TABLE', () => {
      const ddl = 'CREATE TABLE users (id INT, name VARCHAR(255));';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.tableCount).toBe(1);
      expect(result.schema).toBeDefined();
      expect(result.schema!.tables['users']).toBeDefined();
      expect(result.schema!.tables['users']['id']).toBe('INT');
      expect(result.schema!.tables['users']['name']).toBe('VARCHAR(255)');
    });

    it('should parse multiple tables', () => {
      const ddl = `
        CREATE TABLE users (id INT, name TEXT);
        CREATE TABLE orders (id INT, user_id INT, total NUMERIC(10,2));
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.tableCount).toBe(2);
      expect(result.schema!.tables['users']).toBeDefined();
      expect(result.schema!.tables['orders']).toBeDefined();
    });

    it('should handle schema prefix', () => {
      const ddl = 'CREATE TABLE public.users (id INT);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tableDetails[0].schema).toBe('public');
    });

    it('should return error for empty DDL', () => {
      const result = parseDDL('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('parseDDL - Data Types', () => {
    it('should normalize integer types', () => {
      const ddl = `
        CREATE TABLE nums (
          a INT,
          b INTEGER,
          c SMALLINT,
          d BIGINT,
          e SERIAL,
          f BIGSERIAL
        );
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['nums']['a']).toBe('INT');
      expect(result.schema!.tables['nums']['b']).toBe('INT');
      expect(result.schema!.tables['nums']['c']).toBe('SMALLINT');
      expect(result.schema!.tables['nums']['d']).toBe('BIGINT');
      expect(result.schema!.tables['nums']['e']).toBe('SERIAL');
      expect(result.schema!.tables['nums']['f']).toBe('BIGSERIAL');
    });

    it('should handle VARCHAR with length', () => {
      const ddl = 'CREATE TABLE t (a VARCHAR(100), b VARCHAR);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['a']).toBe('VARCHAR(100)');
      expect(result.schema!.tables['t']['b']).toBe('VARCHAR');
    });

    it('should handle NUMERIC with precision and scale', () => {
      const ddl = 'CREATE TABLE t (a NUMERIC(10,2), b NUMERIC(5), c NUMERIC);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['a']).toBe('NUMERIC(10,2)');
      expect(result.schema!.tables['t']['b']).toBe('NUMERIC(5)');
      expect(result.schema!.tables['t']['c']).toBe('NUMERIC');
    });

    it('should handle boolean type', () => {
      const ddl = 'CREATE TABLE t (a BOOLEAN, b BOOL);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['a']).toBe('BOOLEAN');
      expect(result.schema!.tables['t']['b']).toBe('BOOLEAN');
    });

    it('should handle timestamp types', () => {
      const ddl = `
        CREATE TABLE t (
          a TIMESTAMP,
          b TIMESTAMPTZ,
          c DATE,
          d TIME
        );
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['a']).toBe('TIMESTAMP');
      expect(result.schema!.tables['t']['b']).toBe('TIMESTAMPTZ');
      expect(result.schema!.tables['t']['c']).toBe('DATE');
      expect(result.schema!.tables['t']['d']).toBe('TIME');
    });

    it('should handle JSON types', () => {
      const ddl = 'CREATE TABLE t (a JSON, b JSONB);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['a']).toBe('JSON');
      expect(result.schema!.tables['t']['b']).toBe('JSONB');
    });

    it('should handle UUID type', () => {
      const ddl = 'CREATE TABLE t (id UUID);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['id']).toBe('UUID');
    });

    it('should handle TEXT type', () => {
      const ddl = 'CREATE TABLE t (content TEXT);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.schema!.tables['t']['content']).toBe('TEXT');
    });
  });

  describe('parseDDL - Constraints', () => {
    it('should detect PRIMARY KEY column constraint', () => {
      const ddl = 'CREATE TABLE users (id INT PRIMARY KEY, name TEXT);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      const idCol = result.schema!.tableDetails[0].columns.find(c => c.name === 'id');
      expect(idCol?.isPrimaryKey).toBe(true);
      expect(idCol?.nullable).toBe(false);
    });

    it('should detect table-level PRIMARY KEY constraint', () => {
      const ddl = `
        CREATE TABLE users (
          id INT,
          name TEXT,
          PRIMARY KEY (id)
        );
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      const idCol = result.schema!.tableDetails[0].columns.find(c => c.name === 'id');
      expect(idCol?.isPrimaryKey).toBe(true);
    });

    it('should detect NOT NULL constraint', () => {
      const ddl = 'CREATE TABLE users (id INT NOT NULL, name TEXT);';
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      const idCol = result.schema!.tableDetails[0].columns.find(c => c.name === 'id');
      const nameCol = result.schema!.tableDetails[0].columns.find(c => c.name === 'name');
      expect(idCol?.nullable).toBe(false);
      expect(nameCol?.nullable).toBe(true);
    });

    it('should detect REFERENCES (foreign key)', () => {
      const ddl = `
        CREATE TABLE orders (
          id INT PRIMARY KEY,
          user_id INT REFERENCES users(id)
        );
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      const userIdCol = result.schema!.tableDetails[0].columns.find(c => c.name === 'user_id');
      expect(userIdCol?.isForeignKey).toBe(true);
    });
  });

  describe('parseDDL - Real-World Examples', () => {
    it('should parse e-commerce schema', () => {
      const ddl = `
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          price NUMERIC(10,2) NOT NULL,
          description TEXT,
          stock INT DEFAULT 0
        );

        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id),
          product_id INT REFERENCES products(id),
          quantity INT NOT NULL,
          total NUMERIC(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      const result = parseDDL(ddl);

      expect(result.success).toBe(true);
      expect(result.tableCount).toBe(3);

      // Check users table
      expect(result.schema!.tables['users']['id']).toBe('SERIAL');
      expect(result.schema!.tables['users']['email']).toBe('VARCHAR(255)');
      expect(result.schema!.tables['users']['name']).toBe('VARCHAR(100)');
      expect(result.schema!.tables['users']['created_at']).toBe('TIMESTAMP');

      // Check products table
      expect(result.schema!.tables['products']['price']).toBe('NUMERIC(10,2)');
      expect(result.schema!.tables['products']['description']).toBe('TEXT');

      // Check orders table
      expect(result.schema!.tables['orders']['quantity']).toBe('INT');
      expect(result.schema!.tables['orders']['status']).toBe('VARCHAR(50)');
    });
  });

  describe('Schema Lookup Functions', () => {
    const ddl = `
      CREATE TABLE users (id INT, name VARCHAR(100), email TEXT);
      CREATE TABLE orders (id INT, user_id INT, total NUMERIC(10,2));
    `;

    it('lookupColumn should find existing column', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      const dataType = lookupColumn(result.schema!, 'users', 'name');
      expect(dataType).toBe('VARCHAR(100)');
    });

    it('lookupColumn should return undefined for non-existent column', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      const dataType = lookupColumn(result.schema!, 'users', 'nonexistent');
      expect(dataType).toBeUndefined();
    });

    it('lookupColumn should be case-insensitive', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      expect(lookupColumn(result.schema!, 'USERS', 'NAME')).toBe('VARCHAR(100)');
      expect(lookupColumn(result.schema!, 'Users', 'Name')).toBe('VARCHAR(100)');
    });

    it('tableExists should detect existing tables', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      expect(tableExists(result.schema!, 'users')).toBe(true);
      expect(tableExists(result.schema!, 'orders')).toBe(true);
      expect(tableExists(result.schema!, 'nonexistent')).toBe(false);
    });

    it('columnExists should detect existing columns', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      expect(columnExists(result.schema!, 'users', 'id')).toBe(true);
      expect(columnExists(result.schema!, 'users', 'name')).toBe(true);
      expect(columnExists(result.schema!, 'users', 'nonexistent')).toBe(false);
      expect(columnExists(result.schema!, 'orders', 'user_id')).toBe(true);
    });

    it('getTableColumns should return all columns for a table', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      const userColumns = getTableColumns(result.schema!, 'users');
      expect(Object.keys(userColumns)).toHaveLength(3);
      expect(userColumns['id']).toBe('INT');
      expect(userColumns['name']).toBe('VARCHAR(100)');
      expect(userColumns['email']).toBe('TEXT');
    });

    it('getTableColumns should return empty object for non-existent table', () => {
      const result = parseDDL(ddl);
      expect(result.success).toBe(true);

      const columns = getTableColumns(result.schema!, 'nonexistent');
      expect(columns).toEqual({});
    });
  });
});
