/**
 * SQL Parsing API Route
 *
 * Accepts POST requests with SQL queries and returns structured parse data.
 * Handles validation, error cases, and returns consistent JSON responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseSQL } from '@/lib/sql-parser';
import type { ParseRequest, ParseResponse } from '@/types';

/**
 * POST /api/parse
 *
 * Parse a SQL query and return structured data about tables, columns, and joins.
 *
 * @param request - Next.js request object
 * @returns JSON response with parsed query data or error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as ParseRequest;
    const { sql } = body;

    // Validate input
    if (!sql) {
      return NextResponse.json(
        {
          success: false,
          error: 'SQL query is required',
        } satisfies ParseResponse,
        { status: 400 }
      );
    }

    if (typeof sql !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'SQL query must be a string',
        } satisfies ParseResponse,
        { status: 400 }
      );
    }

    if (sql.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'SQL query cannot be empty',
        } satisfies ParseResponse,
        { status: 400 }
      );
    }

    // Parse the SQL query
    const parsedQuery = parseSQL(sql);

    // Check if parsing produced any warnings (non-fatal errors)
    const warnings: string[] = [];
    if (parsedQuery.parseErrors) {
      for (const error of parsedQuery.parseErrors) {
        if (error.type === 'warning') {
          warnings.push(error.message);
        }
      }
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: parsedQuery,
        warnings: warnings.length > 0 ? warnings : undefined,
      } satisfies ParseResponse,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // Allow CORS for development (can be configured based on environment)
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    // Handle parsing errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Determine if this is a user error (bad SQL) or server error
    const isSyntaxError = errorMessage.includes('Failed to parse SQL') ||
                          errorMessage.includes('Invalid SQL') ||
                          errorMessage.includes('cannot be empty');

    const statusCode = isSyntaxError ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      } satisfies ParseResponse,
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
 * OPTIONS /api/parse
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
