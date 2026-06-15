// PyTrace - Dict visualizer: two-column key -> value rows.
// Nested dicts (dict of lists, e.g. adjacency lists / grouped buckets) expand
// each key into its own mini cell-grid sub-row instead of a flat "(...)".

import type { FC } from 'react';
import CollectionLabel from './CollectionLabel';

interface Props {
  varName: string;
  value: Record<string, unknown>;
  badge?: string | null;
}

const MAX_ROWS = 12;
const MAX_NESTED_CELLS = 10;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'string') return v.length > 14 ? `"${v.slice(0, 13)}…"` : `"${v}"`;
  if (typeof v === 'object') return '(...)';
  return String(v);
}

function nestedCellLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'object' && v !== null) return '(...)';
  if (typeof v === 'string') return v.length > 5 ? `${v.slice(0, 4)}~` : `"${v}"`;
  return String(v);
}

const DictVisualizer: FC<Props> = ({ varName, value, badge }) => {
  const entries = Object.entries(value);
  const display = entries.slice(0, MAX_ROWS);
  const overflow = entries.length - display.length;

  return (
    <div>
      <CollectionLabel varName={varName} badge={badge} />
      <div className="mt-1 flex flex-col gap-0.5 max-w-[260px]">
        {display.map(([k, v]) => {
          if (Array.isArray(v)) {
            const cells = v.slice(0, MAX_NESTED_CELLS);
            const cellOverflow = v.length - cells.length;
            return (
              <div key={k} className="rounded border border-[#3c3c3c] px-2 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#9cdcfe] truncate">{k}</span>
                  <span className="text-[#6b6b6b] text-[11px]">→</span>
                </div>
                <div className="flex gap-0.5 overflow-x-auto pb-0.5">
                  {cells.length === 0 ? (
                    <span className="text-[#6b6b6b] text-[11px] font-mono">[]</span>
                  ) : (
                    cells.map((cell, ci) => (
                      <div
                        key={ci}
                        className="min-w-[1.6rem] h-6 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border border-[#3c3c3c] px-1"
                        style={{ background: '#2d2d2d' }}
                      >
                        {nestedCellLabel(cell)}
                      </div>
                    ))
                  )}
                  {cellOverflow > 0 && (
                    <span className="text-[#6b6b6b] text-[11px] shrink-0 self-center">+{cellOverflow}</span>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={k} className="flex items-center gap-2 rounded border border-[#3c3c3c] px-2 py-0.5">
              <span className="text-[11px] font-mono text-[#9cdcfe] truncate">{k}</span>
              <span className="text-[#6b6b6b] text-[11px] shrink-0">→</span>
              <span className="text-[11px] font-mono text-[#ce9178] truncate ml-auto">{cellText(v)}</span>
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="text-[#6b6b6b] text-[11px] px-2">+{overflow} more</div>
        )}
      </div>
    </div>
  );
};

export default DictVisualizer;
