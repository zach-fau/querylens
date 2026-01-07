# ⚠️ DEPRECATED - Use GitHub Issues Instead

**This file is no longer maintained.**

✅ **For current tasks**: Check [GitHub Issues](https://github.com/zach-fau/querylens/issues)

This file is kept for reference only and may be out of sync with actual project status.

---

# QueryLens TODO (Archive)

Technical tasks and features for QueryLens development.

## Week 1: Foundation

### Day 1-2: Project Setup
- [x] Next.js scaffold with TypeScript
- [x] Tailwind CSS + shadcn/ui setup
- [x] React Flow integration
- [x] Project structure and types
- [x] Environment configuration

### Day 3-4: SQL Parser
- [ ] pgsql-ast-parser integration
- [ ] Extract tables from SELECT
- [ ] Extract columns from SELECT
- [ ] Handle table aliases
- [ ] Handle column aliases
- [ ] Unit tests for parser

### Day 5-6: Basic Diagram
- [ ] TableNode component
- [ ] Convert parsed tables to nodes
- [ ] Auto-layout algorithm
- [ ] Column display in nodes
- [ ] Basic styling

### Day 7: Join Visualization
- [ ] Extract JOIN relationships
- [ ] JoinEdge custom component
- [ ] Edge labels for join type
- [ ] Connect nodes with edges

## Week 2: Core Features

### Day 1-2: Column Details
- [ ] Column role detection (selected/join/filter/modified)
- [ ] Color coding by role
- [ ] Handle WHERE clause columns
- [ ] Handle ORDER BY columns

### Day 3-4: Monaco Editor
- [ ] Monaco editor setup
- [ ] SQL syntax highlighting
- [ ] Auto-formatting
- [ ] Error highlighting
- [ ] Example queries dropdown

### Day 5-6: Schema Support
- [ ] Schema upload UI
- [ ] Parse DDL for schema
- [ ] Validate columns against schema
- [ ] Show data types in diagram
- [ ] Highlight missing columns

### Day 7: Advanced SQL
- [ ] CTE (WITH clause) support
- [ ] Subquery support
- [ ] UNION support
- [ ] Window functions

## Week 3: AI & Polish

### Day 1-2: AI Integration
- [ ] OpenAI API setup
- [ ] Prompt engineering for SQL explanation
- [ ] JSON mode for structured output
- [ ] Explanation panel UI
- [ ] Loading states

### Day 3-4: UI Polish
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Loading states
- [ ] Error handling UI
- [ ] Keyboard shortcuts

### Day 5: Testing & Edge Cases
- [ ] Integration tests
- [ ] Test complex queries
- [ ] Error boundary
- [ ] Handle malformed SQL gracefully

### Day 6: Documentation
- [ ] README polish
- [ ] Demo GIF creation
- [ ] Example queries
- [ ] API documentation

### Day 7: Deployment
- [ ] Vercel deployment
- [ ] Environment variables
- [ ] Performance testing
- [ ] Final review

## Future Features (Post-MVP)

### Database Support
- [ ] MySQL dialect
- [ ] SQLite dialect
- [ ] SQL Server dialect

### Sharing
- [ ] Generate shareable URL
- [ ] Export diagram as PNG
- [ ] Export diagram as SVG

### Advanced Features
- [ ] Query comparison (diff two queries)
- [ ] Performance hints (N+1 detection)
- [ ] Schema inference from query

### Extensions
- [ ] VS Code extension
- [ ] JetBrains plugin
- [ ] CLI tool

## Technical Debt

- [ ] Improve AST traversal robustness
- [ ] Add comprehensive error types
- [ ] Optimize for large queries (50+ tables)
- [ ] Add analytics (opt-in)
- [ ] Add feedback mechanism

## Known Issues

- [ ] Complex CTEs may not visualize correctly
- [ ] Some PostgreSQL-specific syntax not supported
- [ ] Large diagrams need better auto-layout
