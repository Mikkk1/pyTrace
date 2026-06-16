// PyTrace — Shared helpers for classifying collection-typed locals
// (str/list/matrix/deque/set/counter/dict/tuple) and filtering out
// non-data variables (functions, dunders, modules) from both panels.

export interface SpecialObj {
  __type__: string;
  items: unknown[];
}

export interface CounterObj {
  __type__: 'counter';
  items: Record<string, number>;
}

export function isSpecialObj(v: unknown): v is SpecialObj {
  return (
    typeof v === 'object' && v !== null &&
    !Array.isArray(v) &&
    '__type__' in (v as Record<string, unknown>)
  );
}

export function isCounterObj(v: unknown): v is CounterObj {
  return isSpecialObj(v) && v.__type__ === 'counter';
}

export function isPlainDict(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !isSpecialObj(v);
}

export type CollectionKind = 'str' | 'list' | 'matrix' | 'deque' | 'set' | 'counter' | 'dict' | 'tuple';

export interface CollectionEntry {
  name: string;
  kind: CollectionKind;
  value: unknown;
}

// Display priority for the COLLECTIONS panel.
const KIND_ORDER: CollectionKind[] = ['str', 'list', 'matrix', 'deque', 'set', 'counter', 'dict', 'tuple'];

/** True if every element of a non-empty array is itself an array (2D matrix/grid). */
function isMatrix(value: unknown[]): boolean {
  return value.length > 0 && value.every((row) => Array.isArray(row));
}

function kindOf(value: unknown): CollectionKind | null {
  if (typeof value === 'string') return value.length > 0 ? 'str' : null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return isMatrix(value) ? 'matrix' : 'list';
  }
  if (isSpecialObj(value)) {
    const items = (value.items as unknown[]) ?? [];
    if (value.__type__ === 'set') return items.length > 0 ? 'set' : null;
    if (value.__type__ === 'tuple') return items.length > 0 ? 'tuple' : null;
    if (value.__type__ === 'deque') return items.length > 0 ? 'deque' : null;
    if (value.__type__ === 'counter') {
      const counterItems = (value as unknown as CounterObj).items ?? {};
      return Object.keys(counterItems).length > 0 ? 'counter' : null;
    }
    return null;
  }
  if (isPlainDict(value)) return 'dict';
  return null;
}

/** True if `value` is a non-empty collection eligible for the COLLECTIONS panel. */
export function isCollectionValue(value: unknown): boolean {
  return kindOf(value) !== null;
}

// ---------------------------------------------------------------------------
// Non-data-variable filter (Phase 7 Bug 1)
// ---------------------------------------------------------------------------

/**
 * True if `name`/`value` represents real user data and should be shown in the
 * COLLECTIONS/VARIABLES panels. Filters out dunder names, the currently-traced
 * function's own name, and any value whose repr leaked through as `<...>`
 * (functions, methods, modules, class instances) — the backend tracer already
 * excludes these for Trace Mode, but Live Mode payloads go through this too.
 */
export function isDataVariable(name: string, value: unknown, currentFnName?: string): boolean {
  if (name.startsWith('__') && name.endsWith('__')) return false;
  if (currentFnName && name === currentFnName) return false;
  if (typeof value === 'string' && value.startsWith('<')) return false;
  return true;
}

/** Filters a locals record down to real data variables (see isDataVariable). */
export function filterDataLocals(
  locals: Record<string, unknown>,
  currentFnName?: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(locals)) {
    if (isDataVariable(name, value, currentFnName)) result[name] = value;
  }
  return result;
}

/**
 * Returns all collection-typed locals, ordered for the COLLECTIONS panel.
 * Non-data variables (Bug 1) are excluded.
 */
export function collectCollections(locals: Record<string, unknown>, currentFnName?: string): CollectionEntry[] {
  const entries: CollectionEntry[] = [];
  for (const [name, value] of Object.entries(locals)) {
    if (!isDataVariable(name, value, currentFnName)) continue;
    const kind = kindOf(value);
    if (kind) entries.push({ name, kind, value });
  }
  entries.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return entries;
}

/**
 * Returns a short summary label (e.g. "Array[6]", "Matrix[3x3]", "str(5)",
 * "set(3)", "Dict{2}", "tuple(4)", "deque(4)", "Counter(3)") for a non-empty
 * collection, or null if `value` isn't one.
 * Used by VariablePanel to render a single dedup summary row per collection.
 */
export function collectionSummaryLabel(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? `str(${value.length})` : null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (isMatrix(value)) {
      const rows = value.length;
      const cols = Math.max(...value.map((r) => (Array.isArray(r) ? r.length : 0)));
      return `Matrix[${rows}x${cols}]`;
    }
    return `Array[${value.length}]`;
  }
  if (isSpecialObj(value)) {
    const items = (value.items as unknown[]) ?? [];
    if (value.__type__ === 'set') return items.length > 0 ? `set(${items.length})` : null;
    if (value.__type__ === 'tuple') return items.length > 0 ? `tuple(${items.length})` : null;
    if (value.__type__ === 'deque') return items.length > 0 ? `deque(${items.length})` : null;
    if (value.__type__ === 'counter') {
      const n = Object.keys((value as unknown as CounterObj).items ?? {}).length;
      return n > 0 ? `Counter(${n})` : null;
    }
    return null;
  }
  if (isPlainDict(value)) {
    const n = Object.keys(value).length;
    return `Dict{${n}}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Smart variable badge labels (Phase 7 Section 1, point 3)
// ---------------------------------------------------------------------------

const ROLE_BADGES: Record<string, string> = {
  stack: 'stack',
  queue: 'queue',
  heap: 'heap',
  min_heap: 'heap',
  max_heap: 'heap',
  minheap: 'heap',
  maxheap: 'heap',
  memo: 'memo',
  cache: 'memo',
  dp: 'dp table',
  graph: 'graph',
  adj: 'graph',
  adjlist: 'graph',
  visited: 'visited',
  seen: 'visited',
  path: 'result',
  result: 'result',
  res: 'result',
  ans: 'result',
};

/** Returns a short role badge for a variable name (e.g. "stack", "dp table"), or null. */
export function getRoleBadge(name: string): string | null {
  return ROLE_BADGES[name.toLowerCase()] ?? null;
}

/** True if `name` looks like a heapq-backed list (heap / min_heap / max_heap). */
export function isHeapName(name: string): boolean {
  return /heap/i.test(name);
}
