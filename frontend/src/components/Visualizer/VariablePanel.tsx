// PyTrace - Variable panel: expanded indices, flash animation, out-of-scope

import { useEffect } from 'react';
import { useTraceStore } from '../../store/traceStore';

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
// Type helpers
// ---------------------------------------------------------------------------

function isSpecialObj(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' && v !== null &&
    !Array.isArray(v) &&
    '__type__' in (v as Record<string, unknown>)
  );
}

function isPlainDict(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !isSpecialObj(v);
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

const MAX_DICT  = 20;

function buildRows(
  locals: Record<string, unknown>,
  prevLocals: Record<string, unknown>,
  changed: Set<string>,
): { active: RowData[]; removed: RowData[] } {
  const active: RowData[] = [];

  for (const [name, value] of Object.entries(locals)) {
    const isChanged  = changed.has(name);
    const prevValue  = prevLocals[name];

    if (Array.isArray(value) && value.length > 0) {
      // Non-expandable summary row only — the ArrayVisualizer grid (ARRAYS
      // section) is the primary display for array contents.
      active.push({
        id: name,
        label: name,
        value: `Array[${value.length}]`,
        isChanged,
        isOutOfScope: false,
        isGroupHeader: true,
      });
    } else if (isPlainDict(value)) {
      const entries = Object.entries(value);
      active.push({
        id: name,
        label: name,
        value: `Dict{${entries.length}}`,
        isChanged,
        isOutOfScope: false,
        isGroupHeader: true,
      });
      const prevDict = isPlainDict(prevValue) ? prevValue : null;
      const slice    = entries.slice(0, MAX_DICT);
      for (const [k, v] of slice) {
        const prevV       = prevDict?.[k];
        const entryChanged = isChanged && v !== prevV;
        active.push({
          id: `${name}["${k}"]`,
          label: `${name}["${k}"]`,
          value: v,
          isChanged: entryChanged,
          isOutOfScope: false,
          isGroupHeader: false,
        });
      }
      if (entries.length > MAX_DICT) {
        active.push({ id: `${name}{+}`, label: `  +${entries.length - MAX_DICT} more`, value: '', isChanged: false, isOutOfScope: false, isGroupHeader: false });
      }
    } else {
      // Primitive, set, special object, empty array/dict
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
    if (!(name in locals)) {
      removed.push({
        id: `__gone__${name}`,
        label: name,
        value,
        isChanged: false,
        isOutOfScope: true,
        isGroupHeader: false,
      });
    }
  }

  return { active, removed };
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function VarRow({ row }: { row: RowData }) {
  if (row.isGroupHeader) {
    // Array/dict header: just the name + type badge, no value column
    const badgeColor = String(row.value).startsWith('Array') ? '#9cdcfe' : '#dcdcaa';
    return (
      <div className={`flex items-center gap-1.5 px-2 pt-2 pb-0.5 ${row.isChanged ? 'pytrace-flash rounded' : ''}`}>
        <span className={`text-xs font-mono font-semibold ${row.isChanged ? 'text-[#dcdcaa]' : 'text-[#9cdcfe]'}`}>
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
  const { active, removed } = buildRows(
    locals as Record<string, unknown>,
    prevLocals,
    changed,
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
