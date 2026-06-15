// PyTrace - Set visualizer: wrapped pill badges (sets have no index/order)

import type { FC } from 'react';

interface Props {
  varName: string;
  items: unknown[];
}

function pillLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'string') return `"${v.length > 12 ? v.slice(0, 11) + '…' : v}"`;
  if (typeof v === 'object') return '(...)';
  return String(v);
}

const SetVisualizer: FC<Props> = ({ varName, items }) => (
  <div>
    <span className="text-[#9cdcfe] text-xs font-mono">{varName}</span>
    <span className="text-[#6b6b6b] text-xs font-mono"> =</span>
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <span className="text-[#6b6b6b] text-xs font-mono">{'{'}</span>
      {items.map((item, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 rounded-full text-[11px] font-mono text-[#4ec9b0] border border-[#4ec9b0]/40"
          style={{ background: '#4ec9b018' }}
        >
          {pillLabel(item)}
        </span>
      ))}
      <span className="text-[#6b6b6b] text-xs font-mono">{'}'}</span>
    </div>
  </div>
);

export default SetVisualizer;
