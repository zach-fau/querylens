'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AIExplanation, ParsedQuery, ExplainResponse } from '@/types';
import { IssueType, IssueSeverity } from '@/types';

interface ExplanationPanelProps {
  /** The parsed query to explain */
  parsedQuery: ParsedQuery | null;
  /** Original SQL string */
  sql: string;
  /** Whether AI explanation is enabled */
  isEnabled: boolean;
  /** Callback when toggle is clicked */
  onToggle: () => void;
}

/**
 * Icon components for different sections
 */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || ''}`}
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
  );
}

/**
 * Collapsible section component
 */
function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 text-left font-medium text-slate-900 dark:text-slate-50 hover:text-slate-700 dark:hover:text-slate-200"
      >
        {title}
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

/**
 * Get severity badge styles
 */
function getSeverityStyles(severity: IssueSeverity): string {
  switch (severity) {
    case IssueSeverity.ERROR:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case IssueSeverity.WARNING:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case IssueSeverity.INFO:
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
}

/**
 * Get issue type badge styles
 */
function getIssueTypeStyles(type: IssueType): string {
  switch (type) {
    case IssueType.PERFORMANCE:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case IssueType.CORRECTNESS:
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case IssueType.SECURITY:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case IssueType.STYLE:
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  }
}

/**
 * Get complexity badge styles
 */
function getComplexityStyles(complexity: string): string {
  switch (complexity) {
    case 'simple':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'complex':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'moderate':
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
}

/**
 * ExplanationPanel - Displays AI-generated SQL query explanations
 */
export function ExplanationPanel({
  parsedQuery,
  sql,
  isEnabled,
  onToggle,
}: ExplanationPanelProps) {
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchExplanation = async () => {
    if (!parsedQuery || !sql) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parsedQuery,
          sql,
        }),
      });

      const result: ExplainResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate explanation');
      }

      if (result.success && result.data) {
        setExplanation(result.data);
      } else {
        throw new Error(result.error || 'Failed to generate explanation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setExplanation(null);
    } finally {
      setIsLoading(false);
    }
  };

  // When enabled and parsedQuery changes, fetch explanation
  const handleToggle = () => {
    if (!isEnabled && parsedQuery && sql) {
      // Turning on - fetch explanation
      onToggle();
      fetchExplanation();
    } else {
      // Turning off - just toggle
      onToggle();
      setExplanation(null);
      setError(null);
    }
  };

  // Re-fetch when parsedQuery changes and enabled
  const handleRefresh = () => {
    if (parsedQuery && sql) {
      fetchExplanation();
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Explanation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isEnabled && explanation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8"
              >
                {isCollapsed ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronUpIcon className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggle}
              disabled={!parsedQuery || isLoading}
              className="min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Analyzing...
                </>
              ) : isEnabled ? (
                'Disable AI'
              ) : (
                <>
                  <SparklesIcon className="mr-1 h-4 w-4" />
                  Explain with AI
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Get AI-powered insights about your SQL query structure and performance
        </CardDescription>
      </CardHeader>

      {isEnabled && !isCollapsed && (
        <CardContent>
          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0 text-sm"
                  onClick={handleRefresh}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && !explanation && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <LoadingSpinner className="h-8 w-8 text-purple-500" />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Analyzing your query with AI...
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* No Query State */}
          {!parsedQuery && !isLoading && (
            <div className="flex min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Parse a SQL query first to get AI explanations
              </p>
            </div>
          )}

          {/* Explanation Content */}
          {explanation && !isLoading && (
            <div className="space-y-4">
              {/* Summary Section */}
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 p-4 dark:from-purple-900/20 dark:to-indigo-900/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="mb-2 font-semibold text-slate-900 dark:text-slate-50">
                      Summary
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300">
                      {explanation.summary}
                    </p>
                  </div>
                  {explanation.complexity && (
                    <span
                      className={`ml-4 rounded-full px-3 py-1 text-xs font-medium ${getComplexityStyles(
                        explanation.complexity
                      )}`}
                    >
                      {explanation.complexity}
                    </span>
                  )}
                </div>
              </div>

              {/* Step by Step */}
              {explanation.stepByStep.length > 0 && (
                <CollapsibleSection title="Step by Step Breakdown">
                  <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {explanation.stepByStep.map((step, index) => (
                      <li key={index} className="pl-2">
                        {step}
                      </li>
                    ))}
                  </ol>
                </CollapsibleSection>
              )}

              {/* Join Explanations */}
              {explanation.joinExplanations.length > 0 && (
                <CollapsibleSection title="Join Relationships">
                  <div className="space-y-3">
                    {explanation.joinExplanations.map((join, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {join.joinType}
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            {join.tables[0]} - {join.tables[1]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {join.explanation}
                        </p>
                        {join.columns && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                            On: {join.columns[0]} = {join.columns[1]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Data Flow */}
              {explanation.dataFlowDescription && (
                <CollapsibleSection title="Data Flow">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {explanation.dataFlowDescription}
                  </p>
                </CollapsibleSection>
              )}

              {/* Potential Issues */}
              {explanation.potentialIssues.length > 0 && (
                <CollapsibleSection title="Potential Issues & Suggestions">
                  <div className="space-y-3">
                    {explanation.potentialIssues.map((issue, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${getSeverityStyles(
                              issue.severity
                            )}`}
                          >
                            {issue.severity}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${getIssueTypeStyles(
                              issue.type
                            )}`}
                          >
                            {issue.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {issue.message}
                        </p>
                        {issue.suggestion && (
                          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                            Suggestion: {issue.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Refresh Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  Refresh Explanation
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
