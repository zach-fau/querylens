// QueryLens Type Definitions

// ==================== SQL Parsing Types ====================

/**
 * Enum for different column roles in a query.
 * A column can have multiple roles simultaneously.
 */
export enum ColumnRole {
  /** Column appears in SELECT clause */
  SELECTED = 'selected',
  /** Column used in JOIN conditions */
  JOIN = 'join',
  /** Column used in WHERE/HAVING conditions */
  FILTER = 'filter',
  /** Column being modified (INSERT/UPDATE) */
  MODIFIED = 'modified',
  /** Column with no special role */
  DEFAULT = 'default',
}

/**
 * SQL JOIN types supported by PostgreSQL
 */
export enum JoinType {
  INNER = 'INNER',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FULL = 'FULL',
  CROSS = 'CROSS',
}

/**
 * SQL query types that QueryLens can parse
 */
export enum QueryType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CTE = 'CTE',
}

/**
 * Represents a table reference in a SQL query.
 * Includes optional schema qualification and alias.
 */
export interface ParsedTable {
  /** Table name (without schema) */
  name: string;
  /** Optional alias (AS clause) */
  alias?: string;
  /** Optional schema name (e.g., "public" in "public.users") */
  schema?: string;
  /** Full qualified name (schema.name or just name) */
  qualifiedName?: string;
}

/**
 * Complete information about a table including its columns.
 * Used for diagram generation and type checking.
 */
export interface TableInfo extends ParsedTable {
  /** Columns from this table used in the query */
  columns: ColumnInfo[];
  /** Is this the primary table (FROM clause) */
  isPrimary?: boolean;
}

/**
 * Represents a column reference in a SQL query.
 * Tracks all the ways a column is used.
 */
export interface ParsedColumn {
  /** Column name */
  name: string;
  /** Table name this column belongs to */
  table?: string;
  /** Optional alias (AS clause) */
  alias?: string;
  /** Column appears in SELECT clause */
  isSelected: boolean;
  /** Column used in JOIN conditions */
  isJoinColumn: boolean;
  /** Column used in WHERE/HAVING conditions */
  isFilterColumn: boolean;
  /** Column being modified (INSERT/UPDATE) */
  isModified: boolean;
  /** Whether the column is valid according to schema (undefined if no schema provided) */
  isValid?: boolean;
  /** Data type from schema (if available) */
  dataType?: string;
}

/**
 * Extended column information for diagram display.
 * Includes data type and computed role.
 */
export interface ColumnInfo extends ParsedColumn {
  /** PostgreSQL data type (if known from schema) */
  dataType?: string;
  /** Primary role of this column in the query */
  role: ColumnRole;
  /** Is this column part of PRIMARY KEY */
  isPrimaryKey?: boolean;
  /** Is this column a FOREIGN KEY */
  isForeignKey?: boolean;
}

/**
 * Represents a JOIN operation between two tables.
 * Contains full information about the join condition.
 */
export interface ParsedJoin {
  /** Type of JOIN (INNER, LEFT, etc.) */
  type: JoinType;
  /** Left table in the join */
  leftTable: string;
  /** Right table in the join */
  rightTable: string;
  /** Column from left table */
  leftColumn: string;
  /** Column from right table */
  rightColumn: string;
  /** Optional raw condition string (for complex joins) */
  condition?: string;
}

/**
 * Extended join information for diagram display.
 */
export interface JoinInfo extends ParsedJoin {
  /** Unique ID for this join */
  id: string;
  /** Human-readable label for diagram edge */
  label: string;
  /** Is this an equi-join (equality condition) */
  isEquiJoin?: boolean;
}

/**
 * Complete parsed query with all extracted information.
 * This is the main output of the SQL parser.
 */
export interface ParsedQuery {
  /** Type of SQL statement */
  type: QueryType;
  /** All tables referenced in the query */
  tables: ParsedTable[];
  /** All columns referenced in the query */
  columns: ParsedColumn[];
  /** All JOIN operations in the query */
  joins: ParsedJoin[];
  /** WHERE clause conditions as strings */
  whereConditions: string[];
  /** Common Table Expressions (WITH clauses) */
  ctes: ParsedQuery[];
  /** Subqueries found in the query */
  subqueries: ParsedQuery[];
  /** Original SQL text */
  rawSql: string;
  /** Optional error if parsing partially failed */
  parseErrors?: ParserError[];
}

/**
 * Parser error information for debugging
 */
export interface ParserError {
  /** Error type */
  type: 'syntax' | 'unsupported' | 'warning';
  /** Error message */
  message: string;
  /** Location in SQL (if available) */
  location?: {
    line: number;
    column: number;
  };
  /** Original error object */
  originalError?: unknown;
}

// ==================== Diagram Types ====================

/**
 * Node data for table visualization in React Flow.
 * Each node represents a table in the query.
 * Extends Record<string, unknown> for React Flow compatibility.
 */
export interface DiagramNodeData extends Record<string, unknown> {
  /** Table name */
  tableName: string;
  /** Table alias (if any) */
  alias?: string;
  /** Schema name (if specified) */
  schema?: string;
  /** Columns from this table used in query */
  columns: DiagramColumn[];
  /** Is this the primary table (FROM clause) */
  isPrimary?: boolean;
}

/**
 * React Flow node for table visualization.
 * Compatible with @xyflow/react Node type.
 */
export interface DiagramNode {
  /** Unique node ID (typically table name or alias) */
  id: string;
  /** Node type (always 'table' for QueryLens) */
  type: 'table';
  /** Position in diagram (x, y coordinates) */
  position: { x: number; y: number };
  /** Table data for rendering */
  data: DiagramNodeData;
  /** Optional node dimensions */
  width?: number;
  height?: number;
}

/**
 * Column information for diagram display.
 * Includes visual hints about column usage.
 */
export interface DiagramColumn {
  /** Column name */
  name: string;
  /** Column role determines color/style */
  role: ColumnRole;
  /** PostgreSQL data type (if known) */
  dataType?: string;
  /** Is this a primary key */
  isPrimaryKey?: boolean;
  /** Is this a foreign key */
  isForeignKey?: boolean;
  /** Whether the column is valid according to schema (undefined if no schema provided) */
  isValid?: boolean;
}

/**
 * Edge data for JOIN visualization in React Flow.
 * Represents a JOIN relationship between two tables.
 * Extends Record<string, unknown> for React Flow compatibility.
 */
export interface DiagramEdgeData extends Record<string, unknown> {
  /** Type of JOIN (INNER, LEFT, etc.) */
  joinType: JoinType;
  /** Column from source table */
  leftColumn: string;
  /** Column from target table */
  rightColumn: string;
  /** Display label for the edge */
  label: string;
  /** Is this an equi-join */
  isEquiJoin?: boolean;
}

/**
 * React Flow edge for JOIN visualization.
 * Compatible with @xyflow/react Edge type.
 */
export interface DiagramEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID (table) */
  source: string;
  /** Target node ID (table) */
  target: string;
  /** Optional source handle (column) */
  sourceHandle?: string;
  /** Optional target handle (column) */
  targetHandle?: string;
  /** Edge type (always 'join' for QueryLens) */
  type: 'join';
  /** JOIN relationship data */
  data: DiagramEdgeData;
  /** Optional edge style */
  style?: Record<string, unknown>;
  /** Optional animated edge */
  animated?: boolean;
}

/**
 * Complete diagram data for React Flow visualization.
 * Contains all nodes and edges for the query diagram.
 */
export interface DiagramData {
  /** All table nodes in the diagram */
  nodes: DiagramNode[];
  /** All JOIN edges in the diagram */
  edges: DiagramEdge[];
}

/**
 * Layout options for diagram auto-layout.
 */
export interface LayoutOptions {
  /** Layout direction */
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  /** Node spacing */
  nodeSpacing?: number;
  /** Rank spacing */
  rankSpacing?: number;
  /** Align nodes */
  align?: 'UL' | 'UR' | 'DL' | 'DR';
}

// ==================== AI Explanation Types ====================

/**
 * AI-generated explanation of a SQL query.
 * Provides human-readable analysis in multiple formats.
 */
export interface AIExplanation {
  /** High-level summary of what the query does */
  summary: string;
  /** Step-by-step breakdown of query execution */
  stepByStep: string[];
  /** Detailed explanations of each JOIN */
  joinExplanations: JoinExplanation[];
  /** Potential issues or optimization suggestions */
  potentialIssues: PotentialIssue[];
  /** Description of data flow through tables */
  dataFlowDescription: string;
  /** Estimated complexity (optional) */
  complexity?: 'simple' | 'moderate' | 'complex';
}

/**
 * Explanation of a specific JOIN operation.
 */
export interface JoinExplanation {
  /** Tables involved in the join (left, right) */
  tables: [string, string];
  /** Plain English explanation of the join */
  explanation: string;
  /** Type of JOIN (INNER, LEFT, etc.) */
  joinType: JoinType;
  /** Columns involved in join condition */
  columns?: [string, string];
}

/**
 * Issue severity levels for query analysis.
 */
export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Issue type categories for query analysis.
 */
export enum IssueType {
  PERFORMANCE = 'performance',
  CORRECTNESS = 'correctness',
  STYLE = 'style',
  SECURITY = 'security',
}

/**
 * Potential issue or optimization suggestion.
 */
export interface PotentialIssue {
  /** Category of issue */
  type: IssueType;
  /** Severity level */
  severity: IssueSeverity;
  /** Description of the issue */
  message: string;
  /** Optional suggestion for fixing */
  suggestion?: string;
  /** Optional location in query */
  location?: string;
}

// ==================== Schema Types ====================

/**
 * Database schema information (optional).
 * Used to enrich diagram with type information and validation.
 */
export interface Schema {
  /** All tables in the schema */
  tables: SchemaTable[];
  /** Schema version (optional) */
  version?: string;
}

/**
 * Complete table schema definition.
 */
export interface SchemaTable {
  /** Table name */
  name: string;
  /** Schema name (e.g., 'public') */
  schema?: string;
  /** All columns in this table */
  columns: SchemaColumn[];
  /** Primary key columns */
  primaryKeys?: string[];
  /** Foreign key constraints */
  foreignKeys?: ForeignKeyConstraint[];
}

/**
 * Column schema definition.
 */
export interface SchemaColumn {
  /** Column name */
  name: string;
  /** PostgreSQL data type */
  dataType: string;
  /** Can this column be NULL */
  nullable: boolean;
  /** Is this part of PRIMARY KEY */
  isPrimaryKey: boolean;
  /** Is this a FOREIGN KEY */
  isForeignKey: boolean;
  /** Foreign key reference (if applicable) */
  references?: {
    table: string;
    column: string;
  };
  /** Default value (optional) */
  defaultValue?: string;
  /** Column constraints (optional) */
  constraints?: string[];
}

/**
 * Foreign key constraint definition.
 */
export interface ForeignKeyConstraint {
  /** Constraint name */
  name?: string;
  /** Columns in this table */
  columns: string[];
  /** Referenced table */
  referencedTable: string;
  /** Referenced columns */
  referencedColumns: string[];
  /** ON DELETE action */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  /** ON UPDATE action */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// ==================== App State Types ====================

/**
 * Application loading states.
 */
export enum LoadingState {
  IDLE = 'idle',
  PARSING = 'parsing',
  GENERATING_DIAGRAM = 'generating_diagram',
  GENERATING_EXPLANATION = 'generating_explanation',
  ERROR = 'error',
}

/**
 * Main application state for QueryLens.
 * Can be managed with Zustand or React Context.
 */
export interface QueryLensState {
  /** Raw SQL input */
  sql: string;
  /** Parsed query structure */
  parsedQuery: ParsedQuery | null;
  /** Diagram data for visualization */
  diagramData: DiagramData | null;
  /** AI-generated explanation */
  explanation: AIExplanation | null;
  /** Optional database schema */
  schema: Schema | null;
  /** Current loading state */
  loadingState: LoadingState;
  /** Error message (if any) */
  error: string | null;
  /** Show/hide AI explanation panel */
  showExplanation: boolean;
}

/**
 * Actions for updating QueryLens state.
 */
export interface QueryLensActions {
  /** Update SQL input */
  setSql: (sql: string) => void;
  /** Set parsed query */
  setParsedQuery: (query: ParsedQuery) => void;
  /** Set diagram data */
  setDiagramData: (data: DiagramData) => void;
  /** Set AI explanation */
  setExplanation: (explanation: AIExplanation) => void;
  /** Set database schema */
  setSchema: (schema: Schema | null) => void;
  /** Set loading state */
  setLoadingState: (state: LoadingState) => void;
  /** Set error message */
  setError: (error: string | null) => void;
  /** Toggle explanation visibility */
  toggleExplanation: () => void;
  /** Reset entire state */
  reset: () => void;
}

// ==================== API Types ====================

/**
 * Request to parse a SQL query.
 */
export interface ParseRequest {
  /** SQL query to parse */
  sql: string;
  /** Optional database schema for validation */
  schema?: Schema;
  /** Optional parsing options */
  options?: {
    /** Include subquery analysis */
    includeSubqueries?: boolean;
    /** Include CTE analysis */
    includeCTEs?: boolean;
    /** Strict mode (fail on warnings) */
    strict?: boolean;
  };
}

/**
 * Response from SQL parsing endpoint.
 */
export interface ParseResponse {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed query data (if successful) */
  data?: ParsedQuery;
  /** Error message (if failed) */
  error?: string;
  /** Warning messages (non-fatal) */
  warnings?: string[];
}

/**
 * Request to generate AI explanation.
 */
export interface ExplainRequest {
  /** Parsed query structure */
  parsedQuery: ParsedQuery;
  /** Original SQL text */
  sql: string;
  /** Optional database schema for context */
  schema?: Schema;
  /** Explanation style preference */
  style?: 'concise' | 'detailed' | 'technical';
}

/**
 * Response from AI explanation endpoint.
 */
export interface ExplainResponse {
  /** Whether explanation generation succeeded */
  success: boolean;
  /** AI explanation (if successful) */
  data?: AIExplanation;
  /** Error message (if failed) */
  error?: string;
  /** Tokens used (for tracking) */
  tokensUsed?: number;
}

/**
 * Request to generate diagram data.
 */
export interface DiagramRequest {
  /** Parsed query structure */
  parsedQuery: ParsedQuery;
  /** Optional layout options */
  layoutOptions?: LayoutOptions;
}

/**
 * Response from diagram generation endpoint.
 */
export interface DiagramResponse {
  /** Whether diagram generation succeeded */
  success: boolean;
  /** Diagram data (if successful) */
  data?: DiagramData;
  /** Error message (if failed) */
  error?: string;
}

// ==================== Utility Types ====================

/**
 * Result type for operations that can fail.
 * Type-safe alternative to throwing exceptions.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Generic API response wrapper.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Validation result for SQL queries.
 */
export interface ValidationResult {
  /** Is the query valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error details.
 */
export interface ValidationError {
  /** Error message */
  message: string;
  /** Location in SQL */
  location?: {
    line: number;
    column: number;
    length?: number;
  };
  /** Error code (optional) */
  code?: string;
}

/**
 * Validation warning details.
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Location in SQL */
  location?: {
    line: number;
    column: number;
  };
  /** Suggestion for fixing */
  suggestion?: string;
}
