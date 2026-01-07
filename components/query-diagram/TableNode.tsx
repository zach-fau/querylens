import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ColumnRole, type DiagramNodeData } from '@/types';

const columnTypeStyles: Record<ColumnRole, string> = {
  [ColumnRole.SELECTED]: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  [ColumnRole.JOIN]: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  [ColumnRole.FILTER]: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  [ColumnRole.MODIFIED]: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  [ColumnRole.DEFAULT]: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};

const invalidColumnStyle = 'bg-red-100 text-red-800 border-red-400 dark:bg-red-950 dark:text-red-300 dark:border-red-700';

const columnTypeIcons: Record<ColumnRole, string> = {
  [ColumnRole.SELECTED]: '\u2192',
  [ColumnRole.JOIN]: '\u26A1',
  [ColumnRole.FILTER]: '\uD83D\uDD0D',
  [ColumnRole.MODIFIED]: '\u270E',
  [ColumnRole.DEFAULT]: '\u00B7',
};

export function TableNode({ data }: { data: DiagramNodeData }) {
  const { tableName, alias, columns } = data;
  const displayName = alias ? `${tableName} (${alias})` : tableName;

  return (
    <div className="min-w-[250px] rounded-lg border-2 border-slate-300 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="h-3 w-3 !bg-purple-500 dark:!bg-purple-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-3 w-3 !bg-purple-500 dark:!bg-purple-400"
      />

      {/* Table header */}
      <div className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 dark:border-slate-600 dark:from-slate-800 dark:to-slate-850">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-slate-600 dark:text-slate-300"
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
          <h3 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
            {displayName}
          </h3>
        </div>
      </div>

      {/* Columns list */}
      <div className="max-h-[400px] overflow-y-auto">
        {columns.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {columns.map((column, index) => {
              const isInvalid = column.isValid === false;
              return (
                <div
                  key={`${column.name}-${index}`}
                  className={cn(
                    'flex items-center gap-2 border-l-4 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800',
                    isInvalid ? invalidColumnStyle : columnTypeStyles[column.role]
                  )}
                  title={isInvalid ? `Column "${column.name}" not found in schema` : column.role}
                >
                  {isInvalid ? (
                    <span className="text-xs text-red-600 dark:text-red-400" title="Invalid column">
                      \u26A0
                    </span>
                  ) : (
                    <span className="text-xs" title={column.role}>
                      {columnTypeIcons[column.role]}
                    </span>
                  )}
                  <span className={cn(
                    'font-mono text-sm font-medium',
                    isInvalid && 'line-through'
                  )}>
                    {column.name}
                  </span>
                  {column.dataType && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                      {column.dataType}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No columns
          </div>
        )}
      </div>

      {/* Column count footer */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {columns.length} column{columns.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

TableNode.displayName = 'TableNode';
