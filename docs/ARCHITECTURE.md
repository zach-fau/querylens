# QueryLens Architecture

This document describes the high-level architecture and key technical decisions for QueryLens.

## Overview

QueryLens is a web application that visualizes SQL query paths through database schemas. It uses a client-side SQL parser to extract structure from queries and renders interactive diagrams using React Flow.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐│
│  │  Monaco  │  │  React Flow  │  │  AI Explanation Panel  ││
│  │  Editor  │  │  Diagram     │  │  (Collapsible)          ││
│  └──────────┘  └──────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  /api/parse  │  │  /api/explain │  │  /api/validate   │  │
│  │  SQL → AST   │  │  AST → AI     │  │  Schema check    │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ pgsql-ast │ │ OpenAI    │ │ Supabase  │
       │ -parser   │ │ GPT-4 API │ │ (storage) │
       └───────────┘ └───────────┘ └───────────┘
```

## Component Architecture

### Frontend Components

```
components/
├── sql-editor/
│   ├── SqlEditor.tsx      # Monaco editor wrapper
│   └── EditorToolbar.tsx  # Format, clear, examples buttons
├── query-diagram/
│   ├── QueryDiagram.tsx   # React Flow container
│   ├── TableNode.tsx      # Custom node for tables
│   ├── ColumnList.tsx     # Column display within nodes
│   └── JoinEdge.tsx       # Custom edge for joins
├── ai-explanation/
│   ├── ExplanationPanel.tsx   # Collapsible panel
│   ├── StepByStep.tsx         # Step-by-step breakdown
│   └── IssuesList.tsx         # Potential issues display
└── ui/                    # shadcn/ui components
```

### Data Flow

1. **User Input** → SQL query entered in Monaco editor
2. **Parse** → pgsql-ast-parser generates Abstract Syntax Tree
3. **Extract** → Custom logic extracts tables, columns, joins from AST
4. **Transform** → Convert to React Flow nodes and edges
5. **Render** → Display interactive diagram
6. **AI (Optional)** → Send structured data to OpenAI for explanation

## Key Technical Decisions

### 1. SQL Parsing: pgsql-ast-parser

**Why this library?**
- PostgreSQL-specific (not generic SQL)
- Returns a proper AST (not regex-based)
- Handles CTEs, subqueries, window functions
- Active maintenance
- MIT licensed

**Alternatives considered:**
- `sql.js` - Too heavy (requires WASM)
- `node-sql-parser` - Generic SQL, less PostgreSQL-specific
- Custom regex - Not robust enough

### 2. Diagram Library: React Flow

**Why React Flow?**
- React-native (not a wrapper around D3)
- Built-in pan, zoom, selection
- Custom nodes and edges
- Excellent performance with virtualization
- MIT licensed with commercial options

**Alternatives considered:**
- `D3.js` - Lower level, more boilerplate
- `Reaflow` - Less mature
- `Dagre + React` - Requires manual positioning

### 3. AI Integration: OpenAI GPT-4

**Why OpenAI?**
- Best reasoning for SQL comprehension
- Structured output with JSON mode
- Rate limiting and moderation built-in

**Cost considerations:**
- GPT-4 is expensive at scale
- Feature is optional (toggle off by default)
- Results are cached per query hash

### 4. State Management: Zustand

**Why Zustand?**
- Minimal boilerplate
- Works well with React Server Components
- Simple to test
- No providers needed

**Alternatives considered:**
- Redux - Overkill for this app
- Jotai - Good but less familiar
- Context API - Works but verbose

## API Design

### POST /api/parse

Parses SQL and returns structured query information.

**Request:**
```json
{
  "sql": "SELECT * FROM users",
  "schema": { ... }  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "SELECT",
    "tables": [...],
    "columns": [...],
    "joins": [...],
    "whereConditions": [...]
  }
}
```

### POST /api/explain

Generates AI explanation for parsed query.

**Request:**
```json
{
  "parsedQuery": { ... },
  "sql": "SELECT * FROM users"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "This query selects all columns...",
    "stepByStep": [...],
    "joinExplanations": [...],
    "potentialIssues": [...]
  }
}
```

## Performance Considerations

### Client-Side Parsing

- SQL parsing happens in browser
- No network round-trip for basic visualization
- Parser is ~50KB gzipped

### Diagram Rendering

- React Flow uses virtualization for large diagrams
- Only visible nodes are rendered
- Animations are GPU-accelerated

### AI Caching

- Explanations are cached by SQL hash
- Reduces API costs
- Faster repeat queries

## Security Considerations

### SQL Handling

- SQL is never executed (parse-only)
- No database connections from the app
- User SQL stays in browser unless AI is enabled

### API Security

- Rate limiting on AI endpoints
- Input validation on all endpoints
- CSRF protection via Next.js

### Data Privacy

- No query logging by default
- AI requests go directly to OpenAI
- Optional self-hosted mode (future)

## Future Architecture Considerations

### Multi-Database Support

```typescript
// Current: PostgreSQL only
import { parse } from 'pgsql-ast-parser';

// Future: Factory pattern for multiple parsers
const parser = getParser(dialect);
const ast = parser.parse(sql);
```

### VS Code Extension

- Share core parsing logic via npm package
- Webview for diagram rendering
- Language server for hover info

### Self-Hosted AI

- Support for local models (Ollama)
- Reduced latency and cost
- Better privacy
