'use client';

import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MonacoEditor, type EditorError } from '@/components/sql-editor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QueryDiagram } from '@/components/query-diagram';
import { EXAMPLE_QUERIES } from '@/lib/example-queries';
import { parseDDL, type Schema } from '@/lib/schema-parser';
import type { ParsedQuery, ParseResponse } from '@/types';

/**
 * Parse error message to extract line and column information.
 * pgsql-ast-parser errors often contain "at line X col Y" pattern.
 */
function parseErrorLocation(errorMessage: string): { line?: number; column?: number } {
  // Match patterns like "Syntax error at line 1 col 28:" or "at line 2 col 15"
  const lineColMatch = errorMessage.match(/(?:at\s+)?line\s+(\d+)\s+col\s+(\d+)/i);
  if (lineColMatch) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    };
  }
  return {};
}

export default function Home() {
  const [sql, setSql] = useState('');
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schema state
  const [ddl, setDdl] = useState('');
  const [schema, setSchema] = useState<Schema | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaTableCount, setSchemaTableCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert error string to EditorError array for Monaco highlighting
  const editorErrors = useMemo<EditorError[]>(() => {
    if (!error) return [];

    const location = parseErrorLocation(error);
    return [
      {
        message: error,
        line: location.line,
        column: location.column,
      },
    ];
  }, [error]);

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
        body: JSON.stringify({ sql, schema }),
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

  const handleLoadExample = (exampleId: string) => {
    const example = EXAMPLE_QUERIES.find((q) => q.id === exampleId);
    if (example) {
      setSql(example.sql);
      setError(null);
      setParsedQuery(null);
    }
  };

  const handleClear = () => {
    setSql('');
    setParsedQuery(null);
    setError(null);
  };

  const handleLoadSchema = () => {
    if (!ddl.trim()) {
      setSchemaError('Please enter DDL statements');
      return;
    }

    setSchemaError(null);

    const result = parseDDL(ddl);

    if (result.success && result.schema) {
      setSchema(result.schema);
      setSchemaTableCount(result.tableCount || 0);
      setSchemaError(null);
      // Re-parse the query with the new schema if we have a query
      if (parsedQuery) {
        handleParse();
      }
    } else {
      setSchemaError(result.error || 'Failed to parse DDL');
      setSchema(null);
      setSchemaTableCount(0);
    }
  };

  const handleClearSchema = () => {
    setDdl('');
    setSchema(null);
    setSchemaError(null);
    setSchemaTableCount(0);
    // Re-parse query without schema if we have a query
    if (parsedQuery) {
      handleParse();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDdl(content);
      setSchemaError(null);
    };
    reader.onerror = () => {
      setSchemaError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormat = () => {
    if (!sql.trim()) return;

    // SQL keywords to uppercase
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
      'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
      'OUTER JOIN', 'CROSS JOIN', 'ON', 'AS', 'USING',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN',
      'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
      'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'NULL', 'IS', 'LIKE', 'BETWEEN', 'TRUE', 'FALSE',
      'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
      'WITH', 'RECURSIVE', 'CTE',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
      'OVER', 'PARTITION BY', 'ROWS', 'RANGE',
      'PRECEDING', 'FOLLOWING', 'UNBOUNDED', 'CURRENT ROW',
    ];

    // Major keywords that should start on a new line
    const newlineKeywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR',
      'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
      'OUTER JOIN', 'CROSS JOIN', 'JOIN',
      'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT',
      'UNION', 'INTERSECT', 'EXCEPT',
      'INSERT', 'UPDATE', 'DELETE', 'SET', 'VALUES',
      'WITH',
    ];

    let formatted = sql;

    // First, normalize whitespace (replace multiple spaces/newlines with single space)
    formatted = formatted.replace(/\s+/g, ' ').trim();

    // Uppercase keywords (case-insensitive replacement)
    // Sort by length descending to handle multi-word keywords first
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword);
    }

    // Add newlines before major keywords
    for (const keyword of newlineKeywords) {
      const regex = new RegExp(`\\s+${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${keyword}`);
    }

    // Add indentation for continuation keywords
    const indentKeywords = ['AND', 'OR'];
    for (const keyword of indentKeywords) {
      const regex = new RegExp(`\n${keyword}\\b`, 'g');
      formatted = formatted.replace(regex, `\n  ${keyword}`);
    }

    // Indent JOIN conditions (ON clauses)
    formatted = formatted.replace(/\n(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN)/g, '\n$1');
    formatted = formatted.replace(/\s+ON\s+/g, '\n  ON ');

    // Clean up any leading/trailing whitespace
    formatted = formatted.trim();

    setSql(formatted);
  };

  // Count invalid columns for display
  const invalidColumnCount = useMemo(() => {
    if (!parsedQuery || !schema) return 0;
    return parsedQuery.columns.filter(c => c.isValid === false).length;
  }, [parsedQuery, schema]);

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
          {/* Left Panel - SQL Input and Schema */}
          <div className="space-y-6">
            {/* SQL Query Card */}
            <Card>
              <CardHeader>
                <CardTitle>SQL Query</CardTitle>
                <CardDescription>
                  Paste your PostgreSQL query to visualize tables, joins, and data flow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MonacoEditor
                  value={sql}
                  onChange={setSql}
                  height="250px"
                  errors={editorErrors}
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
                    onClick={handleFormat}
                    disabled={isLoading || !sql.trim()}
                  >
                    Format SQL
                  </Button>
                  <Select onValueChange={handleLoadExample} disabled={isLoading}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Load Example" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAMPLE_QUERIES.map((example) => (
                        <SelectItem key={example.id} value={example.id}>
                          {example.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <div className="grid grid-cols-4 gap-4 text-center">
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
                      {schema && (
                        <div>
                          <div className={`text-2xl font-bold ${invalidColumnCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {invalidColumnCount}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Invalid
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schema Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Schema (Optional)</span>
                  {schema && (
                    <span className="text-sm font-normal text-green-600">
                      {schemaTableCount} table{schemaTableCount !== 1 ? 's' : ''} loaded
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Upload or paste DDL (CREATE TABLE statements) to validate column names and see data types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={ddl}
                  onChange={(e) => setDdl(e.target.value)}
                  placeholder={`-- Paste your DDL here, for example:
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total NUMERIC(10,2),
  status VARCHAR(50)
);`}
                  className="min-h-[150px] font-mono text-sm"
                />

                {/* Schema Error Display */}
                {schemaError && (
                  <Alert variant="destructive">
                    <AlertTitle>Schema Error</AlertTitle>
                    <AlertDescription>{schemaError}</AlertDescription>
                  </Alert>
                )}

                {/* Schema Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleLoadSchema}
                    disabled={!ddl.trim()}
                    variant={schema ? 'outline' : 'default'}
                  >
                    {schema ? 'Reload Schema' : 'Load Schema'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql,.ddl,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {schema && (
                    <Button
                      variant="outline"
                      onClick={handleClearSchema}
                    >
                      Clear Schema
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

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
