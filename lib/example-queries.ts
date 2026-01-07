export interface ExampleQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    id: 'select-join',
    name: 'SELECT with JOINs',
    description: 'Multiple table joins with filtering',
    sql: `SELECT
  u.id,
  u.name,
  u.email,
  o.order_id,
  o.total_amount,
  p.product_name
FROM users u
INNER JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE u.status = 'active'
  AND o.created_at > '2024-01-01'
ORDER BY o.created_at DESC;`,
  },
  {
    id: 'insert',
    name: 'INSERT Statement',
    description: 'Insert with multiple columns',
    sql: `INSERT INTO employees (
  first_name,
  last_name,
  email,
  department_id,
  hire_date,
  salary
)
VALUES (
  'John',
  'Doe',
  'john.doe@company.com',
  5,
  '2024-01-15',
  75000.00
);`,
  },
  {
    id: 'update',
    name: 'UPDATE Statement',
    description: 'Update with subquery condition',
    sql: `UPDATE products
SET
  price = price * 1.10,
  updated_at = NOW()
WHERE category_id IN (
  SELECT id
  FROM categories
  WHERE name = 'Electronics'
)
  AND stock_quantity > 0;`,
  },
  {
    id: 'delete',
    name: 'DELETE Statement',
    description: 'Delete with JOIN condition',
    sql: `DELETE FROM order_items
WHERE order_id IN (
  SELECT o.id
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE c.status = 'inactive'
    AND o.created_at < '2023-01-01'
);`,
  },
  {
    id: 'cte',
    name: 'CTE (WITH Clause)',
    description: 'Common Table Expression for analytics',
    sql: `WITH monthly_sales AS (
  SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(total_amount) AS revenue,
    COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE_TRUNC('month', order_date)
),
ranked_months AS (
  SELECT
    month,
    revenue,
    order_count,
    RANK() OVER (ORDER BY revenue DESC) AS revenue_rank
  FROM monthly_sales
)
SELECT *
FROM ranked_months
WHERE revenue_rank <= 12
ORDER BY month DESC;`,
  },
  {
    id: 'subquery',
    name: 'Subquery',
    description: 'Correlated subquery with aggregation',
    sql: `SELECT
  c.customer_name,
  c.email,
  (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.customer_id = c.id
  ) AS total_orders,
  (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders o
    WHERE o.customer_id = c.id
      AND o.status = 'completed'
  ) AS lifetime_value
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
    AND o.created_at > '2024-01-01'
)
ORDER BY lifetime_value DESC
LIMIT 100;`,
  },
  {
    id: 'window',
    name: 'Window Functions',
    description: 'Analytics with window functions',
    sql: `SELECT
  e.employee_id,
  e.name,
  e.department_id,
  e.salary,
  AVG(e.salary) OVER (
    PARTITION BY e.department_id
  ) AS dept_avg_salary,
  RANK() OVER (
    PARTITION BY e.department_id
    ORDER BY e.salary DESC
  ) AS salary_rank,
  LAG(e.salary) OVER (
    PARTITION BY e.department_id
    ORDER BY e.hire_date
  ) AS prev_hire_salary,
  SUM(e.salary) OVER (
    PARTITION BY e.department_id
    ORDER BY e.hire_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_dept_salary
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE d.active = true
ORDER BY e.department_id, e.salary DESC;`,
  },
];
