import * as React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Position,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import { JoinType, type DiagramEdgeData } from '@/types';

const joinTypeStyles: Record<JoinType, string> = {
  [JoinType.INNER]: 'bg-purple-100 text-purple-800 border-purple-300',
  [JoinType.LEFT]: 'bg-blue-100 text-blue-800 border-blue-300',
  [JoinType.RIGHT]: 'bg-green-100 text-green-800 border-green-300',
  [JoinType.FULL]: 'bg-amber-100 text-amber-800 border-amber-300',
  [JoinType.CROSS]: 'bg-red-100 text-red-800 border-red-300',
};

const joinTypeColors: Record<JoinType, string> = {
  [JoinType.INNER]: '#9333ea',
  [JoinType.LEFT]: '#3b82f6',
  [JoinType.RIGHT]: '#22c55e',
  [JoinType.FULL]: '#f59e0b',
  [JoinType.CROSS]: '#ef4444',
};

export interface JoinEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: DiagramEdgeData;
  markerEnd?: string;
}

export function JoinEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: JoinEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const joinType = data?.joinType || JoinType.INNER;
  const label = data?.label || joinType;
  const strokeColor = joinTypeColors[joinType];

  return (
    <>
      {/* The edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: 2,
        }}
      />

      {/* The edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-semibold shadow-md',
              joinTypeStyles[joinType]
            )}
          >
            {label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

JoinEdge.displayName = 'JoinEdge';
