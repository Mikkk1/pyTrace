// PyTrace — Auto-detect pointer/index variables from a locals snapshot.
// Spec: ARCHITECTURE.md § Pointer Auto-Detection Logic

// Match case-insensitively so L/R (LeetCode style) and l/r both work.
const POINTER_NAMES_LOWER = new Set([
  'i', 'j', 'k', 'l', 'r',
  'left', 'right',
  'lo', 'hi',
  'start', 'end',
  'ptr',
  'slow', 'fast',
  'mid',
  'top', 'bot',
]);

/**
 * Returns the subset of local variable names that look like array-index pointers:
 * the name (lowercased) is in the canonical pointer list AND the value is a number.
 */
export function detectPointers(locals: Record<string, unknown>): string[] {
  return Object.keys(locals).filter(
    (key) => POINTER_NAMES_LOWER.has(key.toLowerCase()) && typeof locals[key] === 'number',
  );
}

/**
 * Builds a map from pointer name → its current numeric value,
 * filtered to only pointers whose index is valid for `arrayLength`.
 */
export function buildPointerIndices(
  locals: Record<string, unknown>,
  arrayLength: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const name of detectPointers(locals)) {
    const idx = locals[name] as number;
    if (Number.isInteger(idx) && idx >= 0 && idx < arrayLength) {
      result[name] = idx;
    }
  }
  return result;
}
