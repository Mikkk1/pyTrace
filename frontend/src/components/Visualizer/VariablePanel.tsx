// PyTrace - Variable panel: expanded indices, flash animation, out-of-scope

import { useEffect } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { isSpecialObj, isPlainDict, isCounterObj, isDataVariable, collectionSummaryLabel } from '../../lib/collections';

// ---------------------------------------------------------------------------
// Flash animation (injected once into <head>)
// ---------------------------------------------------------------------------

const FLASH_STYLE_ID = 'pytrace-var-flash';

function ensureFlashStyle() {
  if (document.getElementById(FLASH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FLASH_STYLE_ID;
  style.textContent = `
    @keyframes pytrace-flash {
      0%   { background-color: rgba(220, 170, 50, 0.28); }
      100% { background-color: transparent; }
    }
    .pytrace-flash { animation: pytrace-flash 0.75s ease-out; }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Value formatter
// ---------------------------------------------------------------------------

function formatValue(v: unknown): { text: string; color: string } {
  if (v === null || v === undefined) return { text: 'None', color: '#569cd6' };
  if (typeof v === 'boolean') return { text: v ? 'True' : 'False', color: v ? '#4ec9b0' : '#f44747' };
  if (typeof v === 'number') return { text: String(v), color: '#b5cea8' };
  if (typeof v === 'string') {
    if (v.startsWith('<')) return { text: v.slice(0, 50), color: '#6b6b6b' };
    const t = v.length > 48 ? v.slice(0, 48) + '...' : v;
    return { text: `"${t}"`, color: '#ce9178' };
  }
  if (isCounterObj(v)) {
    const n = Object.keys(v.items).length;
    return { text: `Counter(${n})`, color: '#dcdcaa' };
  }
  if (isSpecialObj(v)) {
    const items = (v.items as unknown[]) ?? [];
    if (v.__type__ === 'set') {
      if (items.length === 0) return { text: 'set()', color: '#4ec9b0' };
      const inner = items.slice(0, 5).map((i) => formatValue(i).text).join(', ');
      return { text: `{${inner}${items.length > 5 ? ', ...' : ''}}`, color: '#4ec9b0' };
    }
    return { text: `${v.__type__}(${items.length})`, color: '#dcdcaa' };
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return { text: '[]', color: '#9cdcfe' };
    const inner = v.slice(0, 5).map((x) => formatValue(x).text).join(', ');
    return { text: `[${inner}${v.length > 5 ? ', ...' : ''}]`, color: '#9cdcfe' };
  }
  if (isPlainDict(v)) {
    const entries = Object.entries(v);
    if (entries.length === 0) return { text: '{}', color: '#dcdcaa' };
    const inner = entries.slice(0, 3).map(([k, val]) => `${k}: ${formatValue(val).text}`).join(', ');
    return { text: `{${inner}${entries.length > 3 ? ', ...' : ''}}`, color: '#dcdcaa' };
  }
  return { text: String(v), color: '#d4d4d4' };
}

// ---------------------------------------------------------------------------
// Row data model
// ---------------------------------------------------------------------------

interface RowData {
  id: string;
  label: string;
  value: unknown;
  isChanged: boolean;
  isOutOfScope: boolean;
  isGroupHeader: boolean;
}

function buildRows(
  locals: Record<string, unknown>,
  prevLocals: Record<string, unknown>,
  changed: Set<string>,
  currentFnName?: string,
): { active: RowData[]; removed: RowData[] } {
  const active: RowData[] = [];

  for (const [name, value] of Object.entries(locals)) {
    if (!isDataVariable(name, value, currentFnName)) continue;
    const isChanged = changed.has(name);
    const summary    = collectionSummaryLabel(value);

    if (summary !== null) {
      // Non-expandable summary row only — the COLLECTIONS section (str/list/
      // set/dict/tuple cell grids, pills, key-value rows) is the primary display.
      active.push({
        id: name,
        label: name,
        value: summary,
        isChanged,
        isOutOfScope: false,
        isGroupHeader: true,
      });
    } else {
      // Primitive, frozenset, empty str/array/dict/set/tuple
      active.push({
        id: name,
        label: name,
        value,
        isChanged,
        isOutOfScope: false,
        isGroupHeader: false,
      });
    }
  }

  // Out-of-scope rows (present in prevLocals, absent in current)
  const removed: RowData[] = [];
  for (const [name, value] of Object.entries(prevLocals)) {
    if (!isDataVariable(name, value, currentFnName)) continue;
    if (!(name in locals)) {
      const summary = collectionSummaryLabel(value);
      removed.push({
        id: `__gone__${name}`,
        label: name,
        value: summary ?? value,
        isChanged: false,
        isOutOfScope: true,
        isGroupHeader: summary !== null,
      });
    }
  }

  return { active, removed };
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

// Badge color per collection-summary prefix: Array[N] / Matrix[RxC] / str(N) /
// set(N) / Dict{N} / tuple(N) / deque(N) / Counter(N)
function badgeColorFor(value: string): string {
  if (value.startsWith('Array') || value.startsWith('Matrix')) return '#9cdcfe';
  if (value.startsWith('str')) return '#ce9178';
  if (value.startsWith('set')) return '#4ec9b0';
  if (value.startsWith('tuple')) return '#c586c0';
  if (value.startsWith('deque')) return '#4ec9b0';
  if (value.startsWith('Counter')) return '#dcdcaa';
  return '#dcdcaa'; // Dict{N}
}

function VarRow({ row }: { row: RowData }) {
  if (row.isGroupHeader) {
    // Collection summary header: just the name + type badge, no value column.
    // Also used for out-of-scope collections (rendered with fade + strikethrough).
    const badgeColor = badgeColorFor(String(row.value));
    return (
      <div className={`flex items-center gap-1.5 px-2 pt-2 pb-0.5 ${row.isChanged ? 'pytrace-flash rounded' : ''} ${row.isOutOfScope ? 'opacity-35' : ''}`}>
        <span className={`text-xs font-mono font-semibold ${row.isOutOfScope ? 'line-through text-[#6b6b6b]' : row.isChanged ? 'text-[#dcdcaa]' : 'text-[#9cdcfe]'}`}>
          {row.label}
        </span>
        <span
          className="text-[10px] font-mono px-1 py-px rounded"
          style={{ color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}30` }}
        >
          {String(row.value)}
        </span>
      </div>
    );
  }

  const { text, color } = formatValue(row.value);
  const isIndented = row.label.includes('[') || row.label.includes('"');

  return (
    <div
      className={`flex items-baseline justify-between gap-2 rounded px-2 py-[3px] text-[11px] font-mono transition-colors ${
        row.isOutOfScope ? 'opacity-35' : ''
      } ${row.isChanged ? 'pytrace-flash' : 'hover:bg-[#2a2a2a]'}`}
      style={{ paddingLeft: isIndented ? '20px' : undefined }}
    >
      <span
        className={`shrink-0 ${row.isOutOfScope ? 'line-through text-[#6b6b6b]' : row.isChanged ? 'text-[#dcdcaa] font-semibold' : 'text-[#9cdcfe]'}`}
      >
        {row.label}
      </span>
      {row.value !== '' && (
        <>
          <span className="text-[#3c3c3c] shrink-0 mx-0.5">=</span>
          <span
            className="truncate text-right"
            style={{ color: row.isOutOfScope ? '#555' : color, maxWidth: '160px' }}
            title={text}
          >
            {text}
          </span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function VariablePanel() {
  const steps    = useTraceStore((s) => s.steps);
  const stepIdx  = useTraceStore((s) => s.currentStepIndex);
  const currStep = useTraceStore((s) => s.currentStep);

  useEffect(() => { ensureFlashStyle(); }, []);

  if (!currStep) {
    return (
      <div className="flex items-center justify-center h-20 text-[#6b6b6b] text-xs">
        Run code to see variables
      </div>
    );
  }

  const prevLocals = (steps[stepIdx - 1]?.locals ?? {}) as Record<string, unknown>;
  const { locals, changed_vars } = currStep;
  const changed = new Set(changed_vars);
  const currentFnName = currStep.call_stack[0]?.name;
  const { active, removed } = buildRows(
    locals as Record<string, unknown>,
    prevLocals,
    changed,
    currentFnName,
  );

  if (active.length === 0 && removed.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[#6b6b6b] text-xs">
        No variables in scope
      </div>
    );
  }

  const stepKey = String(stepIdx);

  return (
    <div className="p-1.5 pb-2">
      {active.map((row) => (
        <VarRow
          key={row.isChanged ? `${row.id}-${stepKey}` : row.id}
          row={row}
        />
      ))}
      {removed.length > 0 && (
        <>
          <div className="my-1 mx-2 border-t border-[#2d2d2d]" />
          {removed.map((row) => (
            <VarRow key={row.id} row={row} />
          ))}
        </>
      )}
    </div>
  );
}
