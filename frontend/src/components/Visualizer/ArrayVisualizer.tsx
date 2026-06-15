// PyTrace - Array visualizer (VS Code colors, supports nested arrays)

import type { FC } from 'react';

interface Props {
  varName: string;
  items: unknown[];
  pointerIndices: Record<string, number>;
}

const MAX_DISPLAY = 20;
const MAX_NESTED_ROWS = 10;
const PALETTE = ['#dcdcaa', '#9cdcfe', '#4ec9b0', '#ce9178'];

function cellLabel(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (Array.isArray(v)) {
    // Compact inline rep for nested cells -- should not reach here in 2D mode
    const inner = v.slice(0, 4).map((x) => (typeof x === 'string' ? `"${x}"` : String(x))).join(',');
    return v.length > 4 ? `[${inner}…]` : `[${inner}]`;
  }
  if (typeof v === 'object' && v !== null && '__type__' in v) return '(...)';
  if (typeof v === 'string') return v.length > 5 ? `${v.slice(0, 4)}~` : `"${v}"`;
  return String(v);
}

// Render a single flat row of cells with optional pointer highlights
function FlatRow({
  items,
  pointerIndices,
  ptrNames,
}: {
  items: unknown[];
  pointerIndices: Record<string, number>;
  ptrNames: string[];
}) {
  const colorFor = (name: string) => PALETTE[ptrNames.indexOf(name) % PALETTE.length];

  const indexToPointers = new Map<number, string[]>();
  for (const [name, idx] of Object.entries(pointerIndices)) {
    const bucket = indexToPointers.get(idx) ?? [];
    bucket.push(name);
    indexToPointers.set(idx, bucket);
  }

  const display = items.slice(0, MAX_DISPLAY);
  const overflow = items.length - display.length;

  return (
    <div className="flex gap-0.5 items-start min-w-max">
      {display.map((item, idx) => {
        const ptrs = indexToPointers.get(idx) ?? [];
        const primaryColor = ptrs.length > 0 ? colorFor(ptrs[0]) : undefined;
        return (
          <div key={idx} className="flex flex-col items-center gap-0.5">
            <div
              className="w-9 h-7 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border border-[#3c3c3c] transition-colors"
              style={primaryColor
                ? { borderColor: primaryColor, background: `${primaryColor}1a` }
                : { background: '#2d2d2d' }}
            >
              {cellLabel(item)}
            </div>
            <span className="text-[#6b6b6b] text-[10px] leading-none">{idx}</span>
            {ptrs.map((name) => (
              <span key={name} className="text-[10px] font-mono leading-none" style={{ color: colorFor(name) }}>
                ^{name}
              </span>
            ))}
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="self-center text-[#6b6b6b] text-[11px] ml-1">+{overflow}</div>
      )}
    </div>
  );
}

// Render a 2D list-of-lists as stacked compact rows
function NestedRows({ items }: { items: unknown[] }) {
  const rows = items.slice(0, MAX_NESTED_ROWS) as unknown[][];
  const overflow = items.length - rows.length;
  return (
    <div className="flex flex-col gap-0.5 mt-1">
      {rows.map((row, ri) => {
        const isArr = Array.isArray(row);
        const cells = isArr ? row.slice(0, 12) : [row];
        const rowOverflow = isArr && row.length > 12 ? row.length - 12 : 0;
        return (
          <div key={ri} className="flex items-center gap-1">
            <span className="text-[#6b6b6b] text-[10px] w-4 text-right shrink-0">{ri}</span>
            <div className="flex gap-0.5 items-center">
              <span className="text-[#6b6b6b] text-[10px]">[</span>
              {cells.map((cell, ci) => (
                <div
                  key={ci}
                  className="min-w-[2rem] h-6 flex items-center justify-center rounded text-[11px] font-mono text-[#d4d4d4] border border-[#3c3c3c] px-1"
                  style={{ background: '#2d2d2d' }}
                >
                  {cellLabel(cell)}
                </div>
              ))}
              {rowOverflow > 0 && <span className="text-[#6b6b6b] text-[10px]">+{rowOverflow}</span>}
              <span className="text-[#6b6b6b] text-[10px]">]</span>
            </div>
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="text-[#6b6b6b] text-[11px] pl-5">+{overflow} more rows</div>
      )}
    </div>
  );
}

const ArrayVisualizer: FC<Props> = ({ varName, items, pointerIndices }) => {
  const ptrNames = Object.keys(pointerIndices);
  // Detect 2D: if any element is itself an array, use nested renderer
  const isNested = items.length > 0 && items.some((x) => Array.isArray(x));

  return (
    <div>
      <span className="text-[#9cdcfe] text-xs font-mono">{varName}</span>
      <span className="text-[#6b6b6b] text-xs font-mono"> =</span>
      {items.length === 0 ? (
        <span className="text-[#6b6b6b] text-xs font-mono ml-1">[]</span>
      ) : isNested ? (
        <NestedRows items={items} />
      ) : (
        <div className="mt-1 overflow-x-auto pb-1">
          <FlatRow items={items} pointerIndices={pointerIndices} ptrNames={ptrNames} />
        </div>
      )}
    </div>
  );
};

export default ArrayVisualizer;
