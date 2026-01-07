/**
 * AI SQL Explanation API Route
 *
 * Accepts POST requests with parsed SQL queries and returns AI-generated explanations.
 * Uses OpenAI GPT-4 for high-quality, structured explanations.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type {
  ExplainRequest,
  ExplainResponse,
  AIExplanation,
  JoinExplanation,
  PotentialIssue,
  ParsedQuery,
} from '@/types';
import { JoinType, IssueType, IssueSeverity } from '@/types';

// System prompt for GPT-4 to generate SQL explanations
const SYSTEM_PROMPT = `You are an expert SQL analyst who explains database queries in plain English. Your role is to help developers understand complex SQL queries by breaking them down into clear, actionable explanations.

When analyzing a SQL query, you should:
1. Provide a concise 1-2 sentence summary of what the query does
2. Explain each table's role and relationships
3. Describe key columns and their purposes
4. Identify potential performance concerns

Always respond with valid JSON in this exact structure:
{
  "summary": "A 1-2 sentence plain English description of what this query does",
  "stepByStep": ["Step 1 description", "Step 2 description", ...],
  "joinExplanations": [
    {
      "tables": ["table1", "table2"],
      "explanation": "Plain English explanation of this join",
      "joinType": "INNER|LEFT|RIGHT|FULL|CROSS",
      "columns": ["column1", "column2"]
    }
  ],
  "potentialIssues": [
    {
      "type": "performance|correctness|style|security",
      "severity": "info|warning|error",
      "message": "Description of the issue",
      "suggestion": "How to fix or improve"
    }
  ],
  "dataFlowDescription": "Description of how data flows through the query",
  "complexity": "simple|moderate|complex"
}

Be specific about table names and column names from the actual query. Focus on practical insights that help developers understand and maintain the query.`;

/**
 * Create user prompt from parsed query data
 */
function createUserPrompt(parsedQuery: ParsedQuery, sql: string): string {
  const tableList = parsedQuery.tables.map(t =>
    t.alias ? `${t.name} (alias: ${t.alias})` : t.name
  ).join(', ');

  const columnList = parsedQuery.columns.map(c => {
    const roles: string[] = [];
    if (c.isSelected) roles.push('selected');
    if (c.isJoinColumn) roles.push('join');
    if (c.isFilterColumn) roles.push('filter');
    if (c.isModified) roles.push('modified');
    const roleStr = roles.length > 0 ? ` (${roles.join(', ')})` : '';
    return c.table ? `${c.table}.${c.name}${roleStr}` : `${c.name}${roleStr}`;
  }).join(', ');

  const joinList = parsedQuery.joins.map(j =>
    `${j.type} JOIN: ${j.leftTable}.${j.leftColumn} = ${j.rightTable}.${j.rightColumn}`
  ).join('\n');

  const whereList = parsedQuery.whereConditions.join(' AND ');

  return `Analyze this ${parsedQuery.type} SQL query and provide a detailed explanation:

SQL Query:
\`\`\`sql
${sql}
\`\`\`

Parsed Structure:
- Query Type: ${parsedQuery.type}
- Tables: ${tableList || 'None'}
- Columns: ${columnList || 'None'}
- Joins:
${joinList || 'None'}
- WHERE Conditions: ${whereList || 'None'}
- CTEs: ${parsedQuery.ctes.length > 0 ? parsedQuery.ctes.length + ' CTE(s)' : 'None'}
- Subqueries: ${parsedQuery.subqueries.length > 0 ? parsedQuery.subqueries.length + ' subquery(ies)' : 'None'}

Provide your analysis as JSON.`;
}

/**
 * Validate and parse GPT response into AIExplanation
 */
function parseGPTResponse(content: string): AIExplanation {
  // Try to extract JSON from the response (GPT might wrap it in markdown code blocks)
  let jsonStr = content;

  // Remove markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const parsed = JSON.parse(jsonStr);

  // Validate and normalize the response
  const explanation: AIExplanation = {
    summary: parsed.summary || 'Unable to generate summary',
    stepByStep: Array.isArray(parsed.stepByStep) ? parsed.stepByStep : [],
    joinExplanations: [],
    potentialIssues: [],
    dataFlowDescription: parsed.dataFlowDescription || '',
    complexity: ['simple', 'moderate', 'complex'].includes(parsed.complexity)
      ? parsed.complexity
      : 'moderate',
  };

  // Parse join explanations
  if (Array.isArray(parsed.joinExplanations)) {
    explanation.joinExplanations = parsed.joinExplanations.map((j: Record<string, unknown>): JoinExplanation => ({
      tables: Array.isArray(j.tables) && j.tables.length >= 2
        ? [String(j.tables[0]), String(j.tables[1])] as [string, string]
        : ['unknown', 'unknown'],
      explanation: String(j.explanation || ''),
      joinType: normalizeJoinType(j.joinType),
      columns: Array.isArray(j.columns) && j.columns.length >= 2
        ? [String(j.columns[0]), String(j.columns[1])] as [string, string]
        : undefined,
    }));
  }

  // Parse potential issues
  if (Array.isArray(parsed.potentialIssues)) {
    explanation.potentialIssues = parsed.potentialIssues.map((i: Record<string, unknown>): PotentialIssue => ({
      type: normalizeIssueType(i.type),
      severity: normalizeIssueSeverity(i.severity),
      message: String(i.message || ''),
      suggestion: i.suggestion ? String(i.suggestion) : undefined,
    }));
  }

  return explanation;
}

/**
 * Normalize join type from GPT response
 */
function normalizeJoinType(type: unknown): JoinType {
  if (typeof type !== 'string') return JoinType.INNER;
  const normalized = type.toUpperCase();
  if (normalized.includes('LEFT')) return JoinType.LEFT;
  if (normalized.includes('RIGHT')) return JoinType.RIGHT;
  if (normalized.includes('FULL')) return JoinType.FULL;
  if (normalized.includes('CROSS')) return JoinType.CROSS;
  return JoinType.INNER;
}

/**
 * Normalize issue type from GPT response
 */
function normalizeIssueType(type: unknown): IssueType {
  if (typeof type !== 'string') return IssueType.STYLE;
  const normalized = type.toLowerCase();
  if (normalized === 'performance') return IssueType.PERFORMANCE;
  if (normalized === 'correctness') return IssueType.CORRECTNESS;
  if (normalized === 'security') return IssueType.SECURITY;
  return IssueType.STYLE;
}

/**
 * Normalize issue severity from GPT response
 */
function normalizeIssueSeverity(severity: unknown): IssueSeverity {
  if (typeof severity !== 'string') return IssueSeverity.INFO;
  const normalized = severity.toLowerCase();
  if (normalized === 'warning') return IssueSeverity.WARNING;
  if (normalized === 'error') return IssueSeverity.ERROR;
  return IssueSeverity.INFO;
}

/**
 * POST /api/explain
 *
 * Generate an AI explanation for a parsed SQL query.
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'sk-your-api-key-here') {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env.local file.',
        } satisfies ExplainResponse,
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Parse request body
    const body = (await request.json()) as ExplainRequest;
    const { parsedQuery, sql } = body;

    // Validate input
    if (!parsedQuery) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parsed query data is required',
        } satisfies ExplainResponse,
        { status: 400 }
      );
    }

    if (!sql) {
      return NextResponse.json(
        {
          success: false,
          error: 'Original SQL query is required',
        } satisfies ExplainResponse,
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
    });

    // Create the prompt
    const userPrompt = createUserPrompt(parsedQuery, sql);

    // Call OpenAI API
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '1500', 10);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3, // Lower temperature for more consistent JSON output
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the response
    const explanation = parseGPTResponse(responseContent);

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: explanation,
        tokensUsed: completion.usage?.total_tokens,
      } satisfies ExplainResponse,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for specific OpenAI errors
    let statusCode = 500;
    let userMessage = errorMessage;

    if (errorMessage.includes('rate limit')) {
      statusCode = 429;
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('API key')) {
      statusCode = 401;
      userMessage = 'Invalid OpenAI API key. Please check your configuration.';
    } else if (errorMessage.includes('JSON')) {
      statusCode = 500;
      userMessage = 'Failed to parse AI response. Please try again.';
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
      } satisfies ExplainResponse,
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

/**
 * OPTIONS /api/explain
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
