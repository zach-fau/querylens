import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ColumnRole, type DiagramNodeData } from '@/types';

const columnTypeStyles: Record<ColumnRole, string> = {
  [ColumnRole.SELECTED]: 'bg-blue-50 text-blue-700 border-blue-200',
  [ColumnRole.JOIN]: 'bg-purple-50 text-purple-700 border-purple-200',
  [ColumnRole.FILTER]: 'bg-amber-50 text-amber-700 border-amber-200',
  [ColumnRole.MODIFIED]: 'bg-green-50 text-green-700 border-green-200',
  [ColumnRole.DEFAULT]: 'bg-gray-50 text-gray-600 border-gray-200',
};

const columnTypeIcons: Record<ColumnRole, string> = {
  [ColumnRole.SELECTED]: '→',
  [ColumnRole.JOIN]: '⚡',
  [ColumnRole.FILTER]: '🔍',
  [ColumnRole.MODIFIED]: '✎',
  [ColumnRole.DEFAULT]: '·',
};

export function TableNode({ data }: { data: DiagramNodeData }) {
  const { tableName, alias, columns } = data;
  const displayName = alias ? `${tableName} (${alias})` : tableName;

  return (
    <div className="min-w-[250px] rounded-lg border-2 border-gray-300 bg-white shadow-lg">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="h-3 w-3 !bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-3 w-3 !bg-purple-500"
      />

      {/* Table header */}
      <div className="border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="font-mono text-sm font-bold text-gray-800">
            {displayName}
          </h3>
        </div>
      </div>

      {/* Columns list */}
      <div className="max-h-[400px] overflow-y-auto">
        {columns.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {columns.map((column, index) => (
              <div
                key={`${column.name}-${index}`}
                className={cn(
                  'flex items-center gap-2 border-l-4 px-4 py-2.5 transition-colors hover:bg-gray-50',
                  columnTypeStyles[column.role]
                )}
              >
                <span className="text-xs" title={column.role}>
                  {columnTypeIcons[column.role]}
                </span>
                <span className="font-mono text-sm font-medium">
                  {column.name}
                </span>
                {column.dataType && (
                  <span className="ml-auto text-xs text-gray-500">
                    {column.dataType}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            No columns
          </div>
        )}
      </div>

      {/* Column count footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <p className="text-xs text-gray-500">
          {columns.length} column{columns.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

TableNode.displayName = 'TableNode';
