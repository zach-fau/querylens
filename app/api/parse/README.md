# Parse API Endpoint

Parse SQL queries and extract structured information about tables, columns, joins, and query structure.

## Endpoint

```
POST /api/parse
```

## Request Format

```typescript
{
  "sql": string;           // Required: PostgreSQL query to parse
  "options"?: {            // Optional parsing options
    "includeSubqueries"?: boolean;
    "includeCTEs"?: boolean;
    "strict"?: boolean;
  }
}
```

## Response Format

### Success Response (200)

```typescript
{
  "success": true,
  "data": {
    "type": "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "CTE",
    "tables": [
      {
        "name": string,
        "alias"?: string,
        "schema"?: string
      }
    ],
    "columns": [
      {
        "name": string,
        "table"?: string,
        "alias"?: string,
        "isSelected": boolean,
        "isJoinColumn": boolean,
        "isFilterColumn": boolean,
        "isModified": boolean
      }
    ],
    "joins": [
      {
        "type": "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS",
        "leftTable": string,
        "rightTable": string,
        "leftColumn": string,
        "rightColumn": string,
        "condition"?: string
      }
    ],
    "whereConditions": string[],
    "ctes": ParsedQuery[],
    "subqueries": ParsedQuery[],
    "rawSql": string
  },
  "warnings"?: string[]  // Optional parsing warnings
}
```

### Error Response (400/500)

```typescript
{
  "success": false,
  "error": string  // Error message
}
```

## Examples

### Parse a Simple SELECT

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT id, name FROM users WHERE active = true"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "type": "SELECT",
    "tables": [
      { "name": "users" }
    ],
    "columns": [
      {
        "name": "id",
        "table": "users",
        "isSelected": true,
        "isJoinColumn": false,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "name",
        "table": "users",
        "isSelected": true,
        "isJoinColumn": false,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "active",
        "table": "users",
        "isSelected": false,
        "isJoinColumn": false,
        "isFilterColumn": true,
        "isModified": false
      }
    ],
    "joins": [],
    "whereConditions": ["active = true"],
    "ctes": [],
    "subqueries": [],
    "rawSql": "SELECT id, name FROM users WHERE active = true"
  }
}
```

### Parse a JOIN Query

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT u.id, u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id WHERE u.active = true"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "type": "SELECT",
    "tables": [
      { "name": "users", "alias": "u" },
      { "name": "posts", "alias": "p" }
    ],
    "columns": [
      {
        "name": "id",
        "table": "users",
        "isSelected": true,
        "isJoinColumn": true,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "name",
        "table": "users",
        "isSelected": true,
        "isJoinColumn": false,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "title",
        "table": "posts",
        "isSelected": true,
        "isJoinColumn": false,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "user_id",
        "table": "posts",
        "isSelected": false,
        "isJoinColumn": true,
        "isFilterColumn": false,
        "isModified": false
      },
      {
        "name": "active",
        "table": "users",
        "isSelected": false,
        "isJoinColumn": false,
        "isFilterColumn": true,
        "isModified": false
      }
    ],
    "joins": [
      {
        "type": "INNER",
        "leftTable": "users",
        "rightTable": "posts",
        "leftColumn": "id",
        "rightColumn": "user_id",
        "condition": "u.id = p.user_id"
      }
    ],
    "whereConditions": ["active = true"],
    "ctes": [],
    "subqueries": [],
    "rawSql": "SELECT u.id, u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id WHERE u.active = true"
  }
}
```

## Error Cases

### Empty SQL

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"sql": ""}'
```

Response (400):
```json
{
  "success": false,
  "error": "SQL query cannot be empty"
}
```

### Invalid SQL Syntax

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT FROM WHERE"}'
```

Response (400):
```json
{
  "success": false,
  "error": "Failed to parse SQL: syntax error at or near \"FROM\""
}
```

### Missing SQL Field

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response (400):
```json
{
  "success": false,
  "error": "SQL query is required"
}
```

## Column Roles

Each column has boolean flags indicating how it's used in the query:

- **isSelected**: Column appears in SELECT clause
- **isJoinColumn**: Column used in JOIN conditions (ON clause)
- **isFilterColumn**: Column used in WHERE/HAVING conditions
- **isModified**: Column being modified (INSERT/UPDATE)

A column can have multiple roles. For example, a column might be both selected and used in a join condition.

## Status Codes

- **200**: Success - SQL parsed successfully
- **400**: Bad Request - Invalid input (missing SQL, empty SQL, syntax error)
- **500**: Server Error - Unexpected server error

## CORS

This endpoint includes CORS headers allowing cross-origin requests from any origin (`*`). This can be configured based on your deployment environment.

## Implementation

The endpoint uses:
- **Parser**: `pgsql-ast-parser` for PostgreSQL syntax
- **Type Safety**: Full TypeScript types from `/types/index.ts`
- **Error Handling**: Graceful error handling with clear messages

See `/lib/sql-parser/index.ts` for the core parsing logic.
