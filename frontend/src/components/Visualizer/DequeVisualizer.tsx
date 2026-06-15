// PyTrace - Deque visualizer: horizontal cell grid with L/R end indicators

import type { FC } from 'react';
import CollectionLabel from './CollectionLabel';

interface Props {
  varName: string;
  items: unknown[];
  badge?: string | null;
}

const MAX_CELLS = 14;

function cellLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'object' && v !== null) return '(...)';
  if (typeof v === 'string') return v.length > 5 ? `${v.slice(0, 4)}~` : `"${v}"`;
  return String(v);
}

const DequeVisualizer: FC<Props> = ({ varName, items, badge }) => {
  const display = items.slice(0, MAX_CELLS);
  const overflow = items.length - display.length;

  return (
    <div>
      <CollectionLabel varName={varName} badge={badge ?? 'deque'} />
      {display.length === 0 ? (
        <span className="text-[#6b6b6b] text-xs font-mono ml-1">deque([])</span>
      ) : (
        <div className="mt-1 overflow-x-auto pb-1">
          <div className="flex gap-0.5 items-start min-w-max">
            {display.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-7 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border border-[#3c3c3c]"
                  style={{ background: '#2d2d2d' }}
                >
                  {cellLabel(item)}
                </div>
                <span className="text-[10px] font-mono leading-none text-[#4ec9b0]">
                  {idx === 0 ? 'L' : idx === display.length - 1 && overflow === 0 ? 'R' : ' '}
                </span>
              </div>
            ))}
            {overflow > 0 && (
              <div className="flex flex-col items-center gap-0.5 justify-center">
                <span className="text-[#6b6b6b] text-[11px] px-1.5">+{overflow} more</span>
                <span className="text-[10px] font-mono leading-none text-[#4ec9b0]">R</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DequeVisualizer;
