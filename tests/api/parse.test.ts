/**
 * Tests for /api/parse endpoint
 */

import { describe, it, expect } from 'vitest';
import { POST, OPTIONS } from '@/app/api/parse/route';
import { NextRequest } from 'next/server';
import type { ParseResponse } from '@/types';

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(body: Record<string, unknown>): NextRequest {
  const url = 'http://localhost:3000/api/parse';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return request;
}

describe('/api/parse', () => {
  describe('POST', () => {
    it('should parse a valid SELECT query', async () => {
      const request = createMockRequest({
        sql: 'SELECT id, name FROM users',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data?.type).toBe('SELECT');
      expect(data.data?.tables).toHaveLength(1);
      expect(data.data?.tables[0].name).toBe('users');
      expect(data.data?.columns.length).toBeGreaterThan(0);
    });

    it('should parse a query with JOIN', async () => {
      const request = createMockRequest({
        sql: 'SELECT u.id, p.title FROM users u JOIN posts p ON u.id = p.user_id',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data?.tables).toHaveLength(2);
      expect(data.data?.joins).toHaveLength(1);
      expect(data.data?.joins[0].type).toBe('INNER');
    });

    it('should return 400 for missing SQL', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should return 400 for empty SQL', async () => {
      const request = createMockRequest({
        sql: '',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for whitespace-only SQL', async () => {
      const request = createMockRequest({
        sql: '   \n\t   ',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('empty');
    });

    it('should return 400 for non-string SQL', async () => {
      const request = createMockRequest({
        sql: 12345,
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('must be a string');
    });

    it('should return 400 for invalid SQL syntax', async () => {
      const request = createMockRequest({
        sql: 'SELECT FROM WHERE',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle INSERT queries', async () => {
      const request = createMockRequest({
        sql: "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')",
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.type).toBe('INSERT');
      expect(data.data?.tables[0].name).toBe('users');
    });

    it('should handle UPDATE queries', async () => {
      const request = createMockRequest({
        sql: "UPDATE users SET name = 'Jane' WHERE id = 1",
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.type).toBe('UPDATE');
      expect(data.data?.tables[0].name).toBe('users');
    });

    it('should handle DELETE queries', async () => {
      const request = createMockRequest({
        sql: 'DELETE FROM users WHERE id = 1',
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.type).toBe('DELETE');
      expect(data.data?.tables[0].name).toBe('users');
    });

    it('should include CORS headers in response', async () => {
      const request = createMockRequest({
        sql: 'SELECT * FROM users',
      });

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });

    it('should preserve original SQL in response', async () => {
      const originalSQL = 'SELECT id, name FROM users WHERE active = true';
      const request = createMockRequest({
        sql: originalSQL,
      });

      const response = await POST(request);
      const data = (await response.json()) as ParseResponse;

      expect(data.success).toBe(true);
      expect(data.data?.rawSql).toBe(originalSQL);
    });
  });

  describe('OPTIONS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });
});
