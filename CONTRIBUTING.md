# Contributing to QueryLens

Thank you for your interest in contributing to QueryLens! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/querylens.git
   cd querylens
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Development Workflow

### Code Style

- We use TypeScript for all code
- Format with Prettier: `npm run format`
- Lint with ESLint: `npm run lint`
- Run both before committing

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(parser): add support for window functions
fix(diagram): prevent node overlap on large queries
docs(readme): update installation instructions
```

### Testing

- Write tests for new features
- Run tests: `npm test`
- Check coverage: `npm run test:coverage`

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all checks pass:**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
4. **Create a pull request** with a clear description
5. **Request review** from maintainers

## Project Structure

```
querylens/
├── app/                    # Next.js pages and API routes
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── query-diagram/     # Diagram components
│   ├── sql-editor/        # Editor components
│   └── ai-explanation/    # AI panel components
├── lib/                    # Core logic
│   ├── sql-parser/        # SQL parsing
│   └── ai/                # AI integration
├── types/                  # TypeScript definitions
├── hooks/                  # Custom React hooks
└── tests/                  # Test files
```

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` on GitHub:
- Documentation improvements
- Bug fixes with clear reproduction steps
- Small feature additions

### Larger Contributions

For significant changes, please open an issue first to discuss:
- New SQL dialect support
- Major UI changes
- Architectural changes

## SQL Parser Contributions

The SQL parser is the core of QueryLens. When contributing:

1. **Test with real queries** - Use actual SQL from production codebases
2. **Handle edge cases** - SQL has many valid syntaxes
3. **Document limitations** - What doesn't work yet?

Example test cases to add:
```sql
-- CTEs (Common Table Expressions)
WITH cte AS (SELECT ...) SELECT * FROM cte;

-- Subqueries
SELECT * FROM (SELECT ...) AS sub;

-- Window functions
SELECT ROW_NUMBER() OVER (PARTITION BY ...) FROM ...;
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
