# QueryLens

**Visual SQL query path analyzer with AI plain-English explanations**

<p align="center">
  <img src="docs/demo.gif" alt="QueryLens Demo" width="800" />
</p>

> Paste any PostgreSQL query and instantly see which tables and columns it touches, join relationships, and data flow in an interactive diagram. Plus, get AI-powered explanations of what your query does in plain English.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React Flow](https://img.shields.io/badge/React%20Flow-12-ff0071)](https://reactflow.dev/)

## The Problem

Developers frequently inherit complex databases with 50+ tables and encounter SQL queries they didn't write. Understanding these queries requires:

- **Mental mapping** - Tracing which tables are involved
- **Join comprehension** - Understanding how data flows between tables
- **Column tracking** - Identifying which columns are selected, filtered, or transformed
- **Documentation hunting** - Finding schema documentation (often outdated)

This cognitive load wastes hours per week and causes bugs when developers modify queries they don't fully understand.

## The Solution

QueryLens provides:

1. **Visual Query Path Analysis** - See exactly which tables and columns your query touches
2. **Interactive Diagrams** - Explore relationships with pan, zoom, and click interactions
3. **Color-Coded Columns** - Instantly identify selected, joined, filtered, and modified columns
4. **AI Explanations** - Get plain-English descriptions of what your query does (optional)

## Features

### Core Features

- **SQL Parsing** - Supports SELECT, INSERT, UPDATE, DELETE with CTEs and subqueries
- **Interactive Diagrams** - Built with React Flow for smooth, responsive visualizations
- **Column Role Highlighting**:
  - 🟢 Green: Selected columns
  - 🔵 Blue: Join columns
  - 🟠 Orange: Filter conditions (WHERE)
  - 🔴 Red: Modified columns (INSERT/UPDATE)

### AI Features (Optional)

- **Plain-English Explanations** - "This query fetches all orders from the last 30 days..."
- **Join Reasoning** - Understand why each table is joined
- **Potential Issues** - Spot common patterns like N+1 queries

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (optional, for AI explanations)

### Installation

```bash
# Clone the repository
git clone https://github.com/zach-fau/querylens.git
cd querylens

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your OpenAI API key (optional)
# Edit .env.local and set OPENAI_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Paste your SQL** in the editor
2. **View the diagram** showing tables and relationships
3. **Click nodes** to see column details
4. **Toggle AI** for plain-English explanation (requires API key)

## Example Queries

Try these sample queries to see QueryLens in action:

```sql
-- Simple JOIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed';

-- CTE with aggregation
WITH monthly_sales AS (
  SELECT DATE_TRUNC('month', created_at) as month,
         SUM(amount) as total
  FROM transactions
  GROUP BY 1
)
SELECT * FROM monthly_sales WHERE total > 10000;

-- Complex multi-table query
SELECT p.name, c.name as category,
       (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.active = true;
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Diagrams** | React Flow |
| **SQL Parsing** | pgsql-ast-parser |
| **AI** | OpenAI GPT-4 |
| **State** | Zustand |
| **Testing** | Vitest + Testing Library |

## Project Structure

```
querylens/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── parse/        # SQL parsing endpoint
│   │   └── explain/      # AI explanation endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── query-diagram/    # React Flow diagram components
│   ├── sql-editor/       # Monaco editor wrapper
│   └── ai-explanation/   # AI explanation panel
├── lib/
│   ├── sql-parser/       # SQL parsing logic
│   └── ai/               # OpenAI integration
├── types/                 # TypeScript definitions
├── hooks/                 # Custom React hooks
└── tests/                 # Test files
```

## Development

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

## Roadmap

### MVP (Current)
- [x] Project setup
- [ ] SQL parsing for basic queries
- [ ] React Flow diagram generation
- [ ] Column role detection and highlighting
- [ ] Monaco editor with syntax highlighting
- [ ] AI explanation integration

### Future
- [ ] MySQL and SQLite support
- [ ] Share queries via URL
- [ ] Query comparison (diff two queries)
- [ ] VS Code extension
- [ ] Schema upload for validation

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Why I Built This

I kept inheriting databases with undocumented queries. Reading complex SQL is hard - visualizing the data flow is easy. QueryLens bridges the gap between "reading SQL" and "understanding what it does."

The hardest part was building a robust parser for PostgreSQL's full syntax while keeping the UI responsive. I ended up using pgsql-ast-parser for AST generation and React Flow for visualization.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [React Flow](https://reactflow.dev/) for the excellent diagram library
- [pgsql-ast-parser](https://github.com/oguimbal/pgsql-ast-parser) for PostgreSQL parsing
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components

---

<p align="center">
  Made with coffee by <a href="https://github.com/zach-fau">Zach</a>
</p>
