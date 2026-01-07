'use client';

import * as React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TableNode } from './TableNode';
import { JoinEdge } from './JoinEdge';
import {
  ColumnRole,
  type ParsedQuery,
  type DiagramColumn,
  type DiagramNodeData,
  type DiagramEdgeData,
} from '@/types';

export interface QueryDiagramProps {
  parsedQuery: ParsedQuery | null;
  className?: string;
}

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  join: JoinEdge,
};

/**
 * Simple auto-layout algorithm using hierarchical positioning
 * Tables are arranged left-to-right based on join order
 */
function generateDiagramLayout(parsedQuery: ParsedQuery): {
  nodes: Node<DiagramNodeData>[];
  edges: Edge<DiagramEdgeData>[];
} {
  if (!parsedQuery.tables.length) {
    return { nodes: [], edges: [] };
  }

  const nodes: Node<DiagramNodeData>[] = [];
  const edges: Edge<DiagramEdgeData>[] = [];

  // Track which tables we've positioned
  const positionedTables = new Set<string>();

  // Position the first table
  const firstTable = parsedQuery.tables[0];
  const firstTableId = firstTable.alias || firstTable.name;

  const firstTableColumns = getColumnsForTable(
    parsedQuery,
    firstTable.name,
    firstTable.alias
  );

  nodes.push({
    id: firstTableId,
    type: 'table',
    position: { x: 100, y: 100 },
    data: {
      tableName: firstTable.name,
      alias: firstTable.alias,
      columns: firstTableColumns,
    },
  });

  positionedTables.add(firstTableId);

  // Position remaining tables based on joins
  const currentX = 400;
  const currentY = 100;
  const verticalSpacing = 200;

  parsedQuery.joins.forEach((join, index) => {
    const sourceId = join.leftTable;
    const targetId = join.rightTable;

    // If target table isn't positioned yet, position it
    if (!positionedTables.has(targetId)) {
      const targetTable = parsedQuery.tables.find(
        (t) => (t.alias || t.name) === targetId
      );

      if (targetTable) {
        const targetColumns = getColumnsForTable(
          parsedQuery,
          targetTable.name,
          targetTable.alias
        );

        nodes.push({
          id: targetId,
          type: 'table',
          position: {
            x: currentX,
            y: currentY + index * verticalSpacing,
          },
          data: {
            tableName: targetTable.name,
            alias: targetTable.alias,
            columns: targetColumns,
          },
        });

        positionedTables.add(targetId);
      }
    }

    // Create edge for this join
    edges.push({
      id: `${sourceId}-${targetId}-${index}`,
      source: sourceId,
      target: targetId,
      type: 'join',
      data: {
        joinType: join.type,
        leftColumn: join.leftColumn,
        rightColumn: join.rightColumn,
        label: `${join.type} JOIN\n${join.leftColumn} = ${join.rightColumn}`,
      },
    });
  });

  // Position any remaining tables that weren't part of joins
  parsedQuery.tables.forEach((table) => {
    const tableId = table.alias || table.name;
    if (!positionedTables.has(tableId)) {
      const tableColumns = getColumnsForTable(
        parsedQuery,
        table.name,
        table.alias
      );

      nodes.push({
        id: tableId,
        type: 'table',
        position: {
          x: currentX,
          y: currentY + positionedTables.size * verticalSpacing,
        },
        data: {
          tableName: table.name,
          alias: table.alias,
          columns: tableColumns,
        },
      });

      positionedTables.add(tableId);
    }
  });

  return { nodes, edges };
}

/**
 * Get all columns for a specific table, categorized by their role
 */
function getColumnsForTable(
  parsedQuery: ParsedQuery,
  tableName: string,
  alias?: string
): DiagramColumn[] {
  const tableIdentifier = alias || tableName;
  const columns: DiagramColumn[] = [];
  const seenColumns = new Set<string>();

  parsedQuery.columns.forEach((col) => {
    // Match columns by table name or alias
    if (col.table === tableIdentifier || col.table === tableName) {
      if (!seenColumns.has(col.name)) {
        seenColumns.add(col.name);

        let role: ColumnRole = ColumnRole.DEFAULT;

        // Determine column role based on its usage
        if (col.isSelected) {
          role = ColumnRole.SELECTED;
        } else if (col.isJoinColumn) {
          role = ColumnRole.JOIN;
        } else if (col.isFilterColumn) {
          role = ColumnRole.FILTER;
        } else if (col.isModified) {
          role = ColumnRole.MODIFIED;
        }

        columns.push({
          name: col.name,
          role,
        });
      }
    }
  });

  // If no columns were found, show a placeholder
  if (columns.length === 0) {
    columns.push({
      name: '*',
      role: ColumnRole.DEFAULT,
    });
  }

  return columns;
}

export function QueryDiagram({ parsedQuery, className }: QueryDiagramProps) {
  const { nodes, edges } = React.useMemo(() => {
    if (!parsedQuery) {
      return { nodes: [], edges: [] };
    }
    return generateDiagramLayout(parsedQuery);
  }, [parsedQuery]);

  if (!parsedQuery) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            Paste SQL query to see diagram
          </p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            No tables found in query
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
        }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={() => {
            return '#f3f4f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

QueryDiagram.displayName = 'QueryDiagram';
