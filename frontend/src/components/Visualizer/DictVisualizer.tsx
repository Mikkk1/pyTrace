// PyTrace - Dict visualizer: two-column key -> value rows

import type { FC } from 'react';

interface Props {
  varName: string;
  value: Record<string, unknown>;
}

const MAX_ROWS = 12;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'string') return v.length > 14 ? `"${v.slice(0, 13)}…"` : `"${v}"`;
  if (typeof v === 'object') return '(...)';
  return String(v);
}

const DictVisualizer: FC<Props> = ({ varName, value }) => {
  const entries = Object.entries(value);
  const display = entries.slice(0, MAX_ROWS);
  const overflow = entries.length - display.length;

  return (
    <div>
      <span className="text-[#9cdcfe] text-xs font-mono">{varName}</span>
      <span className="text-[#6b6b6b] text-xs font-mono"> =</span>
      <div className="mt-1 flex flex-col gap-0.5 max-w-[220px]">
        {display.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 rounded border border-[#3c3c3c] px-2 py-0.5">
            <span className="text-[11px] font-mono text-[#9cdcfe] truncate">{k}</span>
            <span className="text-[#6b6b6b] text-[11px] shrink-0">→</span>
            <span className="text-[11px] font-mono text-[#ce9178] truncate ml-auto">{cellText(v)}</span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-[#6b6b6b] text-[11px] px-2">+{overflow} more</div>
        )}
      </div>
    </div>
  );
};

export default DictVisualizer;
