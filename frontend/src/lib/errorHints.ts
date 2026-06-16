// PyTrace - Plain-English hints for common Python runtime errors.
// Patterns are checked in order — first match wins, so specific patterns
// must come before the fallback (pattern-less) entry for each type.

interface HintEntry {
  type: string;
  pattern?: RegExp;
  hint: string;
}

const ERROR_HINT_PATTERNS: HintEntry[] = [
  // IndexError
  { type: 'IndexError', pattern: /list index out of range/, hint: 'List index out of bounds — use len() before indexing or check loop bounds' },
  { type: 'IndexError', pattern: /string index out of range/, hint: 'String index out of bounds — use len(s) or iterate with for c in s' },
  { type: 'IndexError', hint: 'Index out of range — check array length before indexing' },

  // KeyError
  { type: 'KeyError', hint: 'Key not found in dict — use .get(key, default) or check with "key in d" first' },

  // TypeError — ordered most-specific first
  { type: 'TypeError', pattern: /'NoneType'/, hint: 'Variable is None — check if a function forgot to return a value' },
  { type: 'TypeError', pattern: /not subscriptable/, hint: 'Cannot use [] on this type — make sure it is a list, dict, or string' },
  { type: 'TypeError', pattern: /not iterable/, hint: 'Cannot loop over this — make sure it is a list, range, or string' },
  { type: 'TypeError', pattern: /unsupported operand/, hint: 'Type mismatch in arithmetic — check if you are mixing int and str' },
  { type: 'TypeError', pattern: /takes \d+ positional argument/, hint: 'Wrong number of arguments — check the function signature in VARIABLES' },
  { type: 'TypeError', hint: 'Type mismatch — check argument types and method names in VARIABLES panel' },

  // NameError
  { type: 'NameError', pattern: /name '(\w+)' is not defined/, hint: "Variable not defined — check spelling or initialize it before use" },
  { type: 'NameError', hint: 'Name not found — check for typos or missing initialization' },

  // AttributeError
  { type: 'AttributeError', pattern: /'NoneType'/, hint: 'Calling a method on None — the variable was never assigned a value' },
  { type: 'AttributeError', hint: "Method or attribute doesn't exist on this type — check VARIABLES panel for the actual type" },

  // RecursionError
  { type: 'RecursionError', hint: 'Max recursion depth — check your base case, or add memoization with @lru_cache' },

  // ValueError
  { type: 'ValueError', pattern: /invalid literal for int/, hint: 'Cannot convert this string to int — check the input format' },
  { type: 'ValueError', pattern: /math domain/, hint: 'Math domain error — e.g. sqrt of negative or log of zero' },
  { type: 'ValueError', hint: 'Invalid value — check the argument passed to this function' },

  // ZeroDivisionError
  { type: 'ZeroDivisionError', hint: 'Division by zero — add a guard: if divisor != 0' },

  // OverflowError
  { type: 'OverflowError', hint: 'Number too large — Python ints are unbounded but floats overflow; check your algorithm' },

  // StopIteration
  { type: 'StopIteration', hint: 'Iterator is exhausted — check loop termination or use next(it, default)' },

  // MemoryError
  { type: 'MemoryError', hint: 'Out of memory — your data structure grew too large; check for infinite loops' },

  // TimeoutError (custom sandbox)
  { type: 'TimeoutError', hint: 'Execution timed out — check for infinite loops or reduce input size' },
];

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
  const match = error.match(/^([A-Za-z_]\w*(?:Error|Exception|Violation)):\s*([\s\S]*)$/);
  if (!match) return { type: 'Error', message: error, hint: null };
  const [, type, message] = match;

  for (const entry of ERROR_HINT_PATTERNS) {
    if (entry.type !== type) continue;
    if (!entry.pattern || entry.pattern.test(message)) {
      return { type, message, hint: entry.hint };
    }
  }

  return { type, message, hint: null };
}
