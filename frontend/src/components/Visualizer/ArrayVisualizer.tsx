// PyTrace - Array visualizer (VS Code colors, flat str/list/tuple cell grid)

import { useState, type FC } from 'react';
import CollectionLabel from './CollectionLabel';

interface Props {
  varName: string;
  items: unknown[];
  pointerIndices: Record<string, number>;
  badge?: string | null;
  isHeap?: boolean;
}

const EXPAND_THRESHOLD = 12;
const COLLAPSED_DISPLAY = 10;
const PALETTE = ['#dcdcaa', '#9cdcfe', '#4ec9b0', '#ce9178'];

function cellLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (Array.isArray(v)) {
    const inner = v.slice(0, 4).map((x) => (typeof x === 'string' ? `"${x}"` : String(x))).join(',');
    return v.length > 4 ? `[${inner}…]` : `[${inner}]`;
  }
  if (typeof v === 'object' && v !== null && '__type__' in v) return '(...)';
  if (typeof v === 'string') return v.length > 5 ? `${v.slice(0, 4)}~` : `"${v}"`;
  return String(v);
}

// Render a single flat row of cells with optional pointer highlights and a
// heapq "top" indicator on index 0.
function FlatRow({
  items,
  pointerIndices,
  ptrNames,
  isHeap,
}: {
  items: unknown[];
  pointerIndices: Record<string, number>;
  ptrNames: string[];
  isHeap: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const colorFor = (name: string) => PALETTE[ptrNames.indexOf(name) % PALETTE.length];

  const indexToPointers = new Map<number, string[]>();
  for (const [name, idx] of Object.entries(pointerIndices)) {
    const bucket = indexToPointers.get(idx) ?? [];
    bucket.push(name);
    indexToPointers.set(idx, bucket);
  }

  const shouldCollapse = items.length > EXPAND_THRESHOLD && !expanded;
  const display = shouldCollapse ? items.slice(0, COLLAPSED_DISPLAY) : items;
  const overflow = items.length - display.length;

  return (
    <div className="flex gap-0.5 items-start min-w-max flex-wrap">
      {display.map((item, idx) => {
        const ptrs = indexToPointers.get(idx) ?? [];
        const isTop = isHeap && idx === 0;
        const primaryColor = ptrs.length > 0 ? colorFor(ptrs[0]) : undefined;
        return (
          <div key={idx} className="flex flex-col items-center gap-0.5">
            <div
              className="w-9 h-7 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border transition-colors"
              style={
                isTop
                  ? { borderColor: '#dcdcaa', background: '#dcdcaa1a' }
                  : primaryColor
                  ? { borderColor: primaryColor, background: `${primaryColor}1a` }
                  : { background: '#2d2d2d', borderColor: '#3c3c3c' }
              }
            >
              {cellLabel(item)}
            </div>
            <span className="text-[#6b6b6b] text-[10px] leading-none">{idx}</span>
            {isTop && (
              <span className="text-[10px] font-mono leading-none text-[#dcdcaa]">top</span>
            )}
            {ptrs.map((name) => (
              <span key={name} className="text-[10px] font-mono leading-none" style={{ color: colorFor(name) }}>
                ^{name}
              </span>
            ))}
          </div>
        );
      })}
      {overflow > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="self-center text-[#9cdcfe] text-[11px] ml-1 px-1.5 py-0.5 rounded border border-[#3c3c3c] hover:bg-[#2d2d2d] transition-colors"
        >
          +{overflow} more
        </button>
      )}
      {expanded && items.length > EXPAND_THRESHOLD && (
        <button
          onClick={() => setExpanded(false)}
          className="self-center text-[#6b6b6b] text-[11px] ml-1 px-1.5 py-0.5 rounded border border-[#3c3c3c] hover:bg-[#2d2d2d] transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}

const ArrayVisualizer: FC<Props> = ({ varName, items, pointerIndices, badge, isHeap }) => {
  const ptrNames = Object.keys(pointerIndices);

  return (
    <div>
      <CollectionLabel varName={varName} badge={badge} />
      {items.length === 0 ? (
        <span className="text-[#6b6b6b] text-xs font-mono ml-1">[]</span>
      ) : (
        <div className="mt-1 overflow-x-auto pb-1">
          <FlatRow items={items} pointerIndices={pointerIndices} ptrNames={ptrNames} isHeap={!!isHeap} />
        </div>
      )}
    </div>
  );
};

export default ArrayVisualizer;
