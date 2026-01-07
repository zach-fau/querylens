// QueryLens Type Definitions

// ==================== SQL Parsing Types ====================

export interface ParsedTable {
  name: string;
  alias?: string;
  schema?: string;
}

export interface ParsedColumn {
  name: string;
  table?: string;
  alias?: string;
  isSelected: boolean;
  isJoinColumn: boolean;
  isFilterColumn: boolean;
  isModified: boolean;
}

export interface ParsedJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  leftTable: string;
  rightTable: string;
  leftColumn: string;
  rightColumn: string;
  condition?: string;
}

export interface ParsedQuery {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CTE';
  tables: ParsedTable[];
  columns: ParsedColumn[];
  joins: ParsedJoin[];
  whereConditions: string[];
  ctes: ParsedQuery[]; // For WITH clauses
  subqueries: ParsedQuery[];
  rawSql: string;
}

// ==================== Diagram Types ====================

export interface DiagramNode {
  id: string;
  type: 'table';
  position: { x: number; y: number };
  data: {
    tableName: string;
    alias?: string;
    columns: DiagramColumn[];
  };
}

export interface DiagramColumn {
  name: string;
  type: 'selected' | 'join' | 'filter' | 'modified' | 'default';
  dataType?: string;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'join';
  data: {
    joinType: string;
    leftColumn: string;
    rightColumn: string;
    label: string;
  };
}

export type DiagramData = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

// ==================== AI Explanation Types ====================

export interface AIExplanation {
  summary: string;
  stepByStep: string[];
  joinExplanations: JoinExplanation[];
  potentialIssues: PotentialIssue[];
  dataFlowDescription: string;
}

export interface JoinExplanation {
  tables: [string, string];
  explanation: string;
  joinType: string;
}

export interface PotentialIssue {
  type: 'performance' | 'correctness' | 'style';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

// ==================== Schema Types ====================

export interface SchemaTable {
  name: string;
  schema?: string;
  columns: SchemaColumn[];
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface Schema {
  tables: SchemaTable[];
}

// ==================== App State Types ====================

export interface QueryLensState {
  sql: string;
  parsedQuery: ParsedQuery | null;
  diagramData: DiagramData | null;
  explanation: AIExplanation | null;
  schema: Schema | null;
  isLoading: boolean;
  error: string | null;
}

// ==================== API Types ====================

export interface ParseRequest {
  sql: string;
  schema?: Schema;
}

export interface ParseResponse {
  success: boolean;
  data?: ParsedQuery;
  error?: string;
}

export interface ExplainRequest {
  parsedQuery: ParsedQuery;
  sql: string;
}

export interface ExplainResponse {
  success: boolean;
  data?: AIExplanation;
  error?: string;
}
