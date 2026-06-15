// PyTrace — Shared helpers for classifying collection-typed locals (str/list/set/dict/tuple)

export interface SpecialObj {
  __type__: string;
  items: unknown[];
}

export function isSpecialObj(v: unknown): v is SpecialObj {
  return (
    typeof v === 'object' && v !== null &&
    !Array.isArray(v) &&
    '__type__' in (v as Record<string, unknown>)
  );
}

export function isPlainDict(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !isSpecialObj(v);
}

export type CollectionKind = 'str' | 'list' | 'set' | 'dict' | 'tuple';

export interface CollectionEntry {
  name: string;
  kind: CollectionKind;
  value: unknown;
}

// Display priority for the COLLECTIONS panel: strings first (sliding window), then
// lists, sets, dicts, tuples.
const KIND_ORDER: CollectionKind[] = ['str', 'list', 'set', 'dict', 'tuple'];

function kindOf(value: unknown): CollectionKind | null {
  if (typeof value === 'string') return value.length > 0 ? 'str' : null;
  if (Array.isArray(value)) return value.length > 0 ? 'list' : null;
  if (isSpecialObj(value)) {
    const items = (value.items as unknown[]) ?? [];
    if (value.__type__ === 'set') return items.length > 0 ? 'set' : null;
    if (value.__type__ === 'tuple') return items.length > 0 ? 'tuple' : null;
    return null;
  }
  if (isPlainDict(value)) return Object.keys(value).length > 0 ? 'dict' : null;
  return null;
}

/** True if `value` is a non-empty str/list/set/dict/tuple eligible for the COLLECTIONS panel. */
export function isCollectionValue(value: unknown): boolean {
  return kindOf(value) !== null;
}

/**
 * Returns all collection-typed locals (non-empty str/list/set/dict/tuple),
 * ordered: strings, lists, sets, dicts, tuples.
 */
export function collectCollections(locals: Record<string, unknown>): CollectionEntry[] {
  const entries: CollectionEntry[] = [];
  for (const [name, value] of Object.entries(locals)) {
    const kind = kindOf(value);
    if (kind) entries.push({ name, kind, value });
  }
  entries.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return entries;
}

/**
 * Returns a short summary label (e.g. "Array[6]", "str(5)", "set(3)", "Dict{2}",
 * "tuple(4)") for a non-empty collection, or null if `value` isn't one.
 * Used by VariablePanel to render a single dedup summary row per collection.
 */
export function collectionSummaryLabel(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? `str(${value.length})` : null;
  if (Array.isArray(value)) return value.length > 0 ? `Array[${value.length}]` : null;
  if (isSpecialObj(value)) {
    const items = (value.items as unknown[]) ?? [];
    if (value.__type__ === 'set') return items.length > 0 ? `set(${items.length})` : null;
    if (value.__type__ === 'tuple') return items.length > 0 ? `tuple(${items.length})` : null;
    return null;
  }
  if (isPlainDict(value)) {
    const n = Object.keys(value).length;
    return n > 0 ? `Dict{${n}}` : null;
  }
  return null;
}
