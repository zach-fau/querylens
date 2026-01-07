# QueryLens - Agent Instructions

## What This Project Is

QueryLens is a **visual SQL query path analyzer** with AI explanations. Users paste PostgreSQL queries and see an interactive diagram showing tables, columns, joins, and data flow.

**Resume Value**: 8/10 - Strong portfolio project demonstrating database knowledge, visualization skills, and AI integration.

**Timeline**: 3 weeks (started 2026-01-07)

## Quick Context for New Agents

**The Problem**: Developers inherit complex databases with undocumented queries. Reading SQL is hard, visualizing data flow is easy.

**The Solution**: Paste SQL → See interactive diagram → Get AI explanation (optional)

**Tech Stack**: Next.js 16 + React Flow + pgsql-ast-parser + OpenAI + Tailwind/shadcn

## Where Everything Is

| Resource | Location |
|----------|----------|
| **PRD** | `../career-planning/.claude/pm/prds/querylens.md` |
| **Architecture** | `docs/ARCHITECTURE.md` |
| **Task List** | `TODO.md` (local) + GitHub Issues (source of truth) |
| **Research** | `../career-planning/.claude/research/final-recommendations-2026-01-07.md` |

## How to Track Progress

**Use GitHub Issues as the source of truth:**

- [Issue #1](https://github.com/zach-fau/querylens/issues/1) - Week 1: SQL Parser Foundation
- [Issue #2](https://github.com/zach-fau/querylens/issues/2) - Week 2: Column Highlighting & Editor
- [Issue #3](https://github.com/zach-fau/querylens/issues/3) - Week 3: AI Integration & Polish

**Workflow:**
1. Check current GitHub issues for what's in progress
2. Work on tasks from the relevant week's issue
3. Check off completed items in the issue
4. Commit frequently with descriptive messages

**Do NOT use**: CCPM /pm commands (outdated). Keep it simple with GitHub issues.

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run test         # Run tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # Production build
```

## Project Structure

```
querylens/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (parse, explain)
│   ├── layout.tsx
│   └── page.tsx           # Main page
├── components/
│   ├── ui/                # shadcn/ui (button, card, tabs, textarea)
│   ├── query-diagram/     # React Flow diagram components
│   ├── sql-editor/        # Monaco editor wrapper
│   └── ai-explanation/    # AI panel components
├── lib/
│   ├── sql-parser/        # SQL parsing logic (core!)
│   ├── ai/                # OpenAI integration
│   └── utils.ts           # Utility functions
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
├── tests/                  # Vitest tests
└── docs/                   # Architecture docs
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `lib/sql-parser/index.ts` | SQL parsing with pgsql-ast-parser |
| `types/index.ts` | All TypeScript interfaces |
| `components/query-diagram/` | React Flow diagram (to be built) |
| `app/api/parse/route.ts` | Parse SQL endpoint (to be built) |
| `app/api/explain/route.ts` | AI explanation endpoint (to be built) |

## Current Status

**Week**: 1 of 3
**Phase**: Foundation - SQL Parser + Basic Diagram

**Completed:**
- [x] Project setup (Next.js, React Flow, dependencies)
- [x] Type definitions
- [x] Basic SQL parser wrapper
- [x] Documentation

**In Progress:**
- [ ] SQL parser for SELECT queries
- [ ] TableNode component
- [ ] Basic diagram generation

## MVP Features (Keep Focused!)

**Must have (Week 1-3):**
1. Parse SELECT, INSERT, UPDATE, DELETE
2. Show tables as nodes, joins as edges
3. Color-code columns by role
4. Monaco editor with syntax highlighting
5. AI explanation (toggle-able)

**Explicitly out of scope:**
- MySQL/SQLite support
- Query execution/performance analysis
- User accounts/saved queries
- VS Code extension

## Code Patterns

### SQL Parsing
```typescript
import { parseSQL, validateSQL } from '@/lib/sql-parser';

const result = parseSQL('SELECT * FROM users');
// Returns: { tables, columns, joins, whereConditions, ... }
```

### React Flow Diagram
```typescript
import { ReactFlow } from '@xyflow/react';
import { TableNode } from '@/components/query-diagram/TableNode';

const nodeTypes = { table: TableNode };
```

### AI Explanation (future)
```typescript
import OpenAI from 'openai';
const openai = new OpenAI();
// Send structured query data, get plain-English explanation
```

## Environment Variables

Copy `.env.example` to `.env.local`:
```bash
OPENAI_API_KEY=sk-...  # Optional, for AI features
```

## Common Tasks

### Add a new component
1. Create in appropriate `components/` subdirectory
2. Export from index if needed
3. Use shadcn/ui primitives where possible

### Update SQL parser
1. Edit `lib/sql-parser/index.ts`
2. Add tests in `tests/`
3. Update types in `types/index.ts` if needed

### Test parsing
```bash
npm run test -- --filter=parser
```

## Resume Story

> "I built QueryLens because I kept inheriting databases with undocumented queries. It parses SQL, visualizes the query path through your schema, and uses AI to explain what's happening in plain English. The hardest part was building a robust parser for PostgreSQL's full syntax - I ended up supporting CTEs, subqueries, and window functions."

## Links

- **Repo**: https://github.com/zach-fau/querylens
- **PRD**: `../career-planning/.claude/pm/prds/querylens.md`
- **Research**: `../career-planning/.claude/research/final-recommendations-2026-01-07.md`
