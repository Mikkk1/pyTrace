// PyTrace - Plain-English hints for common Python runtime errors.

const ERROR_HINTS: Record<string, string> = {
  IndexError: 'Index out of range — check loop bounds or list size',
  KeyError: 'Key not found — use .get() or check membership first',
  TypeError: 'Type mismatch — check if mixing int/str or wrong method',
  RecursionError: 'Max recursion depth — check your base case',
  AttributeError: "Method doesn't exist on this type — check VARIABLES panel",
};

export interface ParsedError {
  /** e.g. "IndexError", or "Error" if the message has no recognizable type prefix. */
  type: string;
  /** The remainder of the error message after the type prefix. */
  message: string;
  /** Plain-English hint for this error type, or null if none is mapped. */
  hint: string | null;
}

/** Parse a backend error string like "IndexError: list index out of range". */
export function parseError(error: string): ParsedError {
  const match = error.match(/^([A-Za-z_]\w*(?:Error|Exception)):\s*([\s\S]*)$/);
  if (!match) return { type: 'Error', message: error, hint: null };
  const [, type, message] = match;
  return { type, message, hint: ERROR_HINTS[type] ?? null };
}
