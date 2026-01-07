# QueryLens

**Visual SQL Query Path Analyzer with AI Explanations**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/zach-fau/querylens/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-193%20passing-brightgreen)](https://github.com/zach-fau/querylens)

> Paste SQL, see how data flows through your tables, get AI-powered explanations.

<!-- TODO: Add screenshot or demo GIF here -->
<!-- ![QueryLens Demo](./docs/demo.gif) -->

---

## Features

- :mag: **Visual SQL Query Path Analysis** - See your query as an interactive diagram
- :bar_chart: **Interactive React Flow Diagrams** - Pan, zoom, and explore table relationships
- :art: **Color-Coded Columns by Role** - Instantly identify selected, join, filter, and modified columns
- :robot: **AI-Powered Plain-English Explanations** - Understand complex queries without reading SQL
- :memo: **Monaco Editor with Syntax Highlighting** - Professional-grade SQL editing experience
- :sparkles: **Auto-Formatting** - Clean up messy SQL with one click
- :file_folder: **Schema Validation** - Upload DDL to validate column references and data types
- :crescent_moon: **Dark Mode Support** - Easy on the eyes, day or night
- :iphone: **Responsive Design** - Works on desktop, tablet, and mobile
- :keyboard: **Keyboard Shortcuts** - Power user productivity

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/zach-fau/querylens.git
cd querylens

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your OpenAI API key (optional, for AI features)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

### 1. Enter Your SQL Query

Paste your PostgreSQL query into the Monaco editor on the left side. The editor provides:
- Syntax highlighting
- Error indicators
- Auto-completion (coming soon)

**Supported Query Types:**
- `SELECT` - With JOINs, subqueries, CTEs, and UNIONs
- `INSERT` - Track which columns receive data
- `UPDATE` - Visualize which columns are modified
- `DELETE` - See which tables and filters are involved

### 2. Parse and View Diagram

Click **Parse Query** or press `Ctrl/Cmd + Enter` to generate the diagram.

**In the diagram:**
- **Nodes** represent tables referenced in your query
- **Edges** show JOIN relationships between tables
- **Column colors** indicate usage:
  - **Blue**: Selected columns (in SELECT clause)
  - **Green**: Join columns (used in ON conditions)
  - **Orange**: Filter columns (used in WHERE/HAVING)
  - **Purple**: Modified columns (INSERT/UPDATE targets)

### 3. AI Explanations (Optional)

Toggle the **AI Explanation** panel to get:
- **Summary**: One-sentence overview of what the query does
- **Step-by-step breakdown**: How the query executes logically
- **Join explanations**: Plain-English description of each relationship
- **Potential issues**: Warnings about performance or correctness

> **Note**: AI features require an OpenAI API key.

### 4. Schema Validation (Optional)

Upload your database schema (CREATE TABLE statements) to:
- Validate column references exist
- Show data types in the diagram
- Highlight invalid column references in red

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Parse query |
| `Ctrl/Cmd + Shift + F` | Format SQL |
| `Ctrl/Cmd + L` | Clear editor |
| `Ctrl/Cmd + /` | Toggle comment |
| `Escape` | Close panels |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [React Flow](https://reactflow.dev/) | Interactive diagram rendering |
| [pgsql-ast-parser](https://github.com/oguimbal/pgsql-ast-parser) | PostgreSQL SQL parsing |
| [OpenAI GPT-4](https://openai.com/) | AI-powered query explanations |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Code editor (VS Code's editor) |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Accessible UI components |
| [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight state management |
| [Vitest](https://vitest.dev/) | Fast unit testing |

---

## Development

### Commands

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report

# Type checking
npm run typecheck

# Linting and formatting
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format with Prettier
npm run format:check  # Check formatting

# Production build
npm run build
npm run start
```

### Test Status

```
193 tests passing | 11 skipped (known limitations)
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required for AI features (optional if not using AI)
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Customize AI model
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
```

**Get your OpenAI API key:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

> **Privacy Note**: Your SQL queries are only sent to OpenAI if you explicitly enable AI explanations. All parsing happens client-side.

---

## Architecture

QueryLens follows a clean architecture with clear separation of concerns:

```
User Input (SQL)
    |
    v
Monaco Editor --> pgsql-ast-parser --> Parsed Query Structure
    |
    v
Diagram Generator --> React Flow Nodes/Edges
    |
    v
(Optional) OpenAI API --> AI Explanation
```

### Project Structure

```
querylens/
|-- app/                    # Next.js App Router
|   |-- api/               # API routes
|   |   |-- parse/         # SQL parsing endpoint
|   |   +-- explain/       # AI explanation endpoint
|   |-- layout.tsx         # Root layout
|   +-- page.tsx           # Main page
|-- components/
|   |-- ui/                # shadcn/ui components
|   |-- query-diagram/     # React Flow diagram components
|   |-- sql-editor/        # Monaco editor wrapper
|   +-- ai-explanation/    # AI panel components
|-- lib/
|   |-- sql-parser/        # SQL parsing logic
|   |-- schema-parser/     # DDL schema parsing
|   |-- diagram/           # Diagram generation
|   +-- ai/                # OpenAI integration
|-- types/                 # TypeScript definitions
|-- hooks/                 # Custom React hooks
|-- tests/                 # Test suites
+-- docs/                  # Documentation
```

**Key Design Decisions:**

1. **Client-side parsing**: SQL is parsed in the browser using pgsql-ast-parser, avoiding network round-trips for basic visualization.

2. **React Flow for diagrams**: Provides native React components with built-in pan, zoom, and selection.

3. **Optional AI**: AI features are toggle-able and disabled by default to reduce costs and improve privacy.

4. **Zustand for state**: Minimal boilerplate state management that works seamlessly with React Server Components.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed technical documentation.

---

## Limitations

The SQL parser (pgsql-ast-parser) has some known limitations:

### Unsupported Features

| Feature | Status |
|---------|--------|
| `ROWS BETWEEN ... AND ...` frame clause | Not supported |
| `RANGE BETWEEN ... AND ...` frame clause | Not supported |
| `GROUPS` frame type | Not supported |
| `EXCLUDE` clause in window frames | Not supported |
| `SIMILAR TO` operator | Not supported |
| Some `LATERAL` join syntax | Partial support |
| `WITH RECURSIVE` (recursive CTEs) | Not supported |
| `INTERSECT` set operation | Not supported |
| `EXCEPT` set operation | Not supported |
| JSON path operators (`#>`, `#>>`) | Not supported |
| `GROUPING SETS` in GROUP BY | Not supported |

### What Works Well

- Standard `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- All JOIN types (`INNER`, `LEFT`, `RIGHT`, `FULL`, `CROSS`)
- CTEs (`WITH` clauses, non-recursive)
- Subqueries in FROM and WHERE
- `UNION` and `UNION ALL`
- Window functions (basic syntax)
- Aggregate functions
- CASE expressions
- Type casts

---

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

---

## Contributing

Contributions are welcome! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Write/update tests
5. Run the test suite: `npm run test:run`
6. Ensure linting passes: `npm run lint`
7. Commit your changes: `git commit -m 'Add your feature'`
8. Push to your fork: `git push origin feature/your-feature`
9. Open a Pull Request

### Code Guidelines

- Write tests for new features (aim for >80% coverage)
- Follow existing code style (enforced by ESLint/Prettier)
- Use TypeScript types for all new code
- Add JSDoc comments for public functions
- Keep commits focused and atomic

### Reporting Issues

When reporting bugs, please include:
- SQL query that caused the issue
- Expected behavior
- Actual behavior
- Browser and OS information

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with these excellent open-source projects:

- [pgsql-ast-parser](https://github.com/oguimbal/pgsql-ast-parser) - PostgreSQL AST parser by Olivier Guimbal
- [React Flow](https://reactflow.dev/) - Interactive diagram library by xyflow
- [Monaco Editor](https://github.com/microsoft/monaco-editor) - Code editor by Microsoft
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components by shadcn
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Next.js](https://nextjs.org/) - React framework by Vercel
- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- [Vitest](https://vitest.dev/) - Fast unit testing framework

---

<p align="center">
  Made with care for developers who inherit undocumented databases.
</p>
