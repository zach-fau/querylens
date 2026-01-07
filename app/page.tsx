'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QueryDiagram } from '@/components/query-diagram';
import type { ParsedQuery, ParseResponse } from '@/types';

const EXAMPLE_QUERY = `SELECT
  u.id,
  u.name,
  u.email,
  o.order_id,
  o.total_amount,
  p.product_name
FROM users u
INNER JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE u.status = 'active'
  AND o.created_at > '2024-01-01'
ORDER BY o.created_at DESC;`;

export default function Home() {
  const [sql, setSql] = useState('');
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!sql.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      const result: ParseResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse query');
      }

      if (result.success && result.data) {
        setParsedQuery(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to parse query');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setParsedQuery(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = () => {
    setSql(EXAMPLE_QUERY);
    setError(null);
    setParsedQuery(null);
  };

  const handleClear = () => {
    setSql('');
    setParsedQuery(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            QueryLens
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Visualize SQL query paths with interactive diagrams
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Panel - SQL Input */}
          <Card>
            <CardHeader>
              <CardTitle>SQL Query</CardTitle>
              <CardDescription>
                Paste your PostgreSQL query to visualize tables, joins, and data flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="SELECT * FROM users WHERE id = 1;"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                spellCheck={false}
              />

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleParse}
                  disabled={isLoading || !sql.trim()}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Parsing...
                    </>
                  ) : (
                    'Parse Query'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadExample}
                  disabled={isLoading}
                >
                  Load Example
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={isLoading || !sql.trim()}
                >
                  Clear
                </Button>
              </div>

              {/* Stats */}
              {parsedQuery && (
                <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {parsedQuery.tables.length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Tables
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {parsedQuery.columns.length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Columns
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {parsedQuery.joins.length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Joins
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Query Diagram */}
          <Card>
            <CardHeader>
              <CardTitle>Query Diagram</CardTitle>
              <CardDescription>
                Interactive visualization of your query structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!parsedQuery ? (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                      No query parsed
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Enter a SQL query and click &ldquo;Parse Query&rdquo; to visualize it
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-white dark:bg-slate-950">
                  <QueryDiagram parsedQuery={parsedQuery} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>
            Built with Next.js, React Flow, and pgsql-ast-parser
          </p>
        </div>
      </div>
    </div>
  );
}
