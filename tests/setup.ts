/**
 * Vitest Test Setup
 *
 * Global configuration and utilities for all tests.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

// ==================== Global Test Configuration ====================

/**
 * Cleanup after each test to prevent memory leaks.
 */
afterEach(() => {
  cleanup();
});

// ==================== Mock React Flow ====================

/**
 * Mock @xyflow/react for tests that don't need actual rendering.
 * React Flow requires a DOM environment and can be slow to render in tests.
 */
vi.mock('@xyflow/react', () => ({
  ReactFlow: vi.fn(({ children }) => children),
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useReactFlow: vi.fn(() => ({
    fitView: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  })),
  Panel: vi.fn(({ children }) => children),
  Background: vi.fn(() => null),
  Controls: vi.fn(() => null),
  MiniMap: vi.fn(() => null),
}));

// ==================== Mock Monaco Editor ====================

/**
 * Mock Monaco Editor for tests that don't need actual editing.
 */
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange }) => {
    return {
      type: 'textarea',
      props: {
        value,
        onChange: (e: { target: { value: string } }) =>
          onChange?.(e.target.value),
      },
    };
  }),
}));

// ==================== Custom Matchers ====================

/**
 * Extend Vitest matchers with custom assertions.
 */
interface CustomMatchers<R = unknown> {
  toHaveTableCount(expected: number): R;
  toHaveColumnCount(expected: number): R;
  toHaveJoinCount(expected: number): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

/**
 * Custom matcher: Check if ParsedQuery has expected table count.
 */
expect.extend({
  toHaveTableCount(received, expected: number) {
    const { tables } = received;
    const pass = tables?.length === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected tables.length not to be ${expected}`
          : `Expected ${expected} tables, got ${tables?.length || 0}`,
    };
  },
});

/**
 * Custom matcher: Check if ParsedQuery has expected column count.
 */
expect.extend({
  toHaveColumnCount(received, expected: number) {
    const { columns } = received;
    const pass = columns?.length === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected columns.length not to be ${expected}`
          : `Expected ${expected} columns, got ${columns?.length || 0}`,
    };
  },
});

/**
 * Custom matcher: Check if ParsedQuery has expected join count.
 */
expect.extend({
  toHaveJoinCount(received, expected: number) {
    const { joins } = received;
    const pass = joins?.length === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected joins.length not to be ${expected}`
          : `Expected ${expected} joins, got ${joins?.length || 0}`,
    };
  },
});

// ==================== Global Test Utilities ====================

/**
 * Wait for a condition to be true (useful for async tests).
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a deferred promise for testing async operations.
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Mock console methods to prevent noise in test output.
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
}

/**
 * Sleep for testing async operations.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== Environment Variables ====================

/**
 * Set test environment variables.
 * Note: NODE_ENV is typically set by the test runner
 */
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-api-key';
}
