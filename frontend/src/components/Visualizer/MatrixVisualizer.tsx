// PyTrace - 2D matrix/grid visualizer: proper rows x cols grid with optional
// [i][j] cell highlight (e.g. for grid-based recursive DFS like Number of Islands)

import type { FC } from 'react';
import CollectionLabel from './CollectionLabel';

interface Props {
  varName: string;
  matrix: unknown[][];
  highlightCell?: [number, number] | null;
  badge?: string | null;
}

const MAX_ROWS = 10;
const MAX_COLS = 12;

function cellLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'object' && v !== null) return '(...)';
  if (typeof v === 'string') return v.length > 5 ? `${v.slice(0, 4)}~` : v;
  return String(v);
}

const MatrixVisualizer: FC<Props> = ({ varName, matrix, highlightCell, badge }) => {
  const rows = matrix.slice(0, MAX_ROWS);
  const rowOverflow = matrix.length - rows.length;
  const colCount = Math.min(MAX_COLS, Math.max(...matrix.map((r) => (Array.isArray(r) ? r.length : 0))));

  return (
    <div>
      <CollectionLabel varName={varName} badge={badge} />
      <div className="mt-1 overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-0.5">
          {rows.map((row, ri) => {
            const cells = Array.isArray(row) ? row.slice(0, colCount) : [];
            const colOverflow = (Array.isArray(row) ? row.length : 0) - cells.length;
            return (
              <div key={ri} className="flex items-center gap-0.5">
                <span className="text-[#6b6b6b] text-[10px] w-4 text-right shrink-0">{ri}</span>
                {cells.map((cell, ci) => {
                  const isActive = !!highlightCell && highlightCell[0] === ri && highlightCell[1] === ci;
                  return (
                    <div
                      key={ci}
                      className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border transition-colors"
                      style={
                        isActive
                          ? { borderColor: '#dcdcaa', background: '#dcdcaa1a' }
                          : { background: '#2d2d2d', borderColor: '#3c3c3c' }
                      }
                    >
                      {cellLabel(cell)}
                    </div>
                  );
                })}
                {colOverflow > 0 && (
                  <span className="text-[#6b6b6b] text-[10px] shrink-0">+{colOverflow}</span>
                )}
              </div>
            );
          })}
          {rowOverflow > 0 && (
            <div className="text-[#6b6b6b] text-[11px] pl-5">+{rowOverflow} more rows</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatrixVisualizer;
