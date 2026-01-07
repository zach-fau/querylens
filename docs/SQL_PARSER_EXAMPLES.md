# SQL Parser Examples

This document demonstrates the capabilities of the QueryLens SQL parser.

## Basic SELECT Queries

### Simple SELECT
```typescript
const sql = 'SELECT * FROM users';
const result = parseSQL(sql);
// Result:
// {
//   type: 'SELECT',
//   tables: [{ name: 'users' }],
//   columns: [],
//   joins: [],
//   whereConditions: [],
//   rawSql: 'SELECT * FROM users'
// }
```

### SELECT with Specific Columns
```typescript
const sql = 'SELECT id, name, email FROM users';
const result = parseSQL(sql);
// Result:
// columns: [
//   { name: 'id', table: 'users', isSelected: true, isJoinColumn: false, isFilterColumn: false },
//   { name: 'name', table: 'users', isSelected: true, isJoinColumn: false, isFilterColumn: false },
//   { name: 'email', table: 'users', isSelected: true, isJoinColumn: false, isFilterColumn: false }
// ]
```

## Aliases

### Table Aliases
```typescript
const sql = 'SELECT u.id, u.name FROM users AS u';
const result = parseSQL(sql);
// Result:
// tables: [{ name: 'users', alias: 'u' }]
// columns: [
//   { name: 'id', table: 'users', isSelected: true },
//   { name: 'name', table: 'users', isSelected: true }
// ]
```

### Column Aliases
```typescript
const sql = 'SELECT name AS user_name, email AS user_email FROM users';
const result = parseSQL(sql);
// Result:
// columns: [
//   { name: 'name', alias: 'user_name', isSelected: true },
//   { name: 'email', alias: 'user_email', isSelected: true }
// ]
```

## JOIN Operations

### INNER JOIN
```typescript
const sql = `
  SELECT u.id, u.name, o.order_id
  FROM users u
  INNER JOIN orders o ON u.id = o.user_id
`;
const result = parseSQL(sql);
// Result:
// tables: [
//   { name: 'users', alias: 'u' },
//   { name: 'orders', alias: 'o' }
// ]
// joins: [{
//   type: 'INNER',
//   leftTable: 'users',
//   rightTable: 'orders',
//   leftColumn: 'id',
//   rightColumn: 'user_id',
//   condition: 'users.id = orders.user_id'
// }]
// columns: [
//   { name: 'id', table: 'users', isSelected: true, isJoinColumn: true },
//   { name: 'name', table: 'users', isSelected: true },
//   { name: 'order_id', table: 'orders', isSelected: true },
//   { name: 'user_id', table: 'orders', isJoinColumn: true }
// ]
```

### Multiple JOINs
```typescript
const sql = `
  SELECT u.name, o.order_id, p.product_name
  FROM users u
  INNER JOIN orders o ON u.id = o.user_id
  INNER JOIN products p ON o.product_id = p.id
`;
const result = parseSQL(sql);
// Result:
// tables: [
//   { name: 'users', alias: 'u' },
//   { name: 'orders', alias: 'o' },
//   { name: 'products', alias: 'p' }
// ]
// joins: [
//   { type: 'INNER', leftTable: 'users', rightTable: 'orders', ... },
//   { type: 'INNER', leftTable: 'orders', rightTable: 'products', ... }
// ]
```

### Different JOIN Types
The parser supports all standard JOIN types:
- `INNER JOIN`
- `LEFT JOIN` / `LEFT OUTER JOIN`
- `RIGHT JOIN` / `RIGHT OUTER JOIN`
- `FULL JOIN` / `FULL OUTER JOIN`
- `CROSS JOIN`

## WHERE Conditions

### Simple WHERE
```typescript
const sql = "SELECT * FROM users WHERE status = 'active'";
const result = parseSQL(sql);
// Result:
// whereConditions: ["status = 'active'"]
// columns: [
//   { name: 'status', isFilterColumn: true }
// ]
```

### Complex WHERE with AND/OR
```typescript
const sql = `
  SELECT * FROM users
  WHERE (age > 18 AND status = 'active')
     OR (role = 'admin')
`;
const result = parseSQL(sql);
// Result:
// columns: [
//   { name: 'age', isFilterColumn: true },
//   { name: 'status', isFilterColumn: true },
//   { name: 'role', isFilterColumn: true }
// ]
```

## Column Roles

The parser identifies multiple roles for columns:

```typescript
const sql = `
  SELECT u.id, u.name
  FROM users u
  INNER JOIN orders o ON u.id = o.user_id
  WHERE u.id > 100
`;
const result = parseSQL(sql);
// The 'id' column has three roles:
// {
//   name: 'id',
//   table: 'users',
//   isSelected: true,      // Used in SELECT clause
//   isJoinColumn: true,    // Used in JOIN condition
//   isFilterColumn: true   // Used in WHERE clause
// }
```

## INSERT/UPDATE/DELETE

### INSERT
```typescript
const sql = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')";
const result = parseSQL(sql);
// Result:
// type: 'INSERT'
// tables: [{ name: 'users' }]
// columns: [
//   { name: 'name', table: 'users', isModified: true },
//   { name: 'email', table: 'users', isModified: true }
// ]
```

### UPDATE
```typescript
const sql = "UPDATE users SET name = 'Jane', status = 'inactive' WHERE id = 1";
const result = parseSQL(sql);
// Result:
// type: 'UPDATE'
// columns: [
//   { name: 'name', isModified: true },
//   { name: 'status', isModified: true },
//   { name: 'id', isFilterColumn: true }
// ]
```

### DELETE
```typescript
const sql = "DELETE FROM users WHERE status = 'inactive'";
const result = parseSQL(sql);
// Result:
// type: 'DELETE'
// tables: [{ name: 'users' }]
// columns: [
//   { name: 'status', isFilterColumn: true }
// ]
```

## CTEs (WITH Clause)

```typescript
const sql = `
  WITH active_users AS (
    SELECT id, name FROM users WHERE status = 'active'
  )
  SELECT * FROM active_users
`;
const result = parseSQL(sql);
// Result:
// type: 'CTE'
// ctes: [{
//   type: 'SELECT',
//   tables: [{ name: 'users' }],
//   columns: [
//     { name: 'id', isSelected: true },
//     { name: 'name', isSelected: true },
//     { name: 'status', isFilterColumn: true }
//   ]
// }]
// tables: [{ name: 'active_users', alias: 'active_users' }]
```

## Real-World Example

### E-commerce Order Query
```typescript
const sql = `
  SELECT
    o.id AS order_id,
    u.name AS customer_name,
    p.name AS product_name,
    o.quantity,
    o.total_price
  FROM orders o
  INNER JOIN users u ON o.user_id = u.id
  INNER JOIN products p ON o.product_id = p.id
  WHERE o.created_at > '2024-01-01'
    AND o.status = 'completed'
  ORDER BY o.created_at DESC
`;

const result = parseSQL(sql);
// Result provides:
// - 3 tables: orders, users, products (with aliases)
// - 2 joins: orders->users, orders->products
// - 5 selected columns (with aliases)
// - 2 filter columns: created_at, status
// - 4 join columns: user_id, id (users), product_id, id (products)
```

## Validation

```typescript
// Valid SQL
validateSQL('SELECT * FROM users');
// => { valid: true }

// Invalid SQL
validateSQL('SELECT FROM WHERE');
// => { valid: false, error: '...' }

// Empty SQL
validateSQL('');
// => { valid: false, error: 'SQL query cannot be empty' }
```

## Helper Functions

```typescript
const parsed = parseSQL('SELECT u.id FROM users u WHERE u.id > 100');

// Extract just the tables
const tables = extractTables(parsed);
// => [{ name: 'users', alias: 'u' }]

// Extract just the columns
const columns = extractColumns(parsed);
// => [
//   { name: 'id', table: 'users', isSelected: true, isFilterColumn: true }
// ]

// Extract just the joins
const joins = extractJoins(parsed);
// => []
```

## Advanced Features

### Schema Prefixes
```typescript
const sql = 'SELECT * FROM public.users';
const result = parseSQL(sql);
// tables: [{ name: 'users', schema: 'public' }]
```

### Aggregate Functions
```typescript
const sql = 'SELECT COUNT(*), MAX(age), MIN(age) FROM users';
const result = parseSQL(sql);
// Parses successfully, extracting column references inside functions
```

### GROUP BY and ORDER BY
```typescript
const sql = `
  SELECT status, COUNT(*)
  FROM users
  GROUP BY status
  ORDER BY status
`;
const result = parseSQL(sql);
// columns: [{ name: 'status', isSelected: true, isFilterColumn: true }]
```

### Subqueries
```typescript
const sql = `
  SELECT u.name
  FROM (SELECT * FROM users WHERE active = true) u
`;
const result = parseSQL(sql);
// subqueries: [{ type: 'SELECT', ... }]
// tables: [{ name: 'u', alias: 'u' }]
```

## Error Handling

The parser provides clear, actionable error messages:

```typescript
try {
  parseSQL('INVALID SQL');
} catch (error) {
  console.error(error.message);
  // => "Failed to parse SQL: syntax error at or near 'INVALID'"
}

try {
  parseSQL('');
} catch (error) {
  console.error(error.message);
  // => "SQL query cannot be empty"
}
```
