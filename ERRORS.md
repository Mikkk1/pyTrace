# PyTrace — Error Log

> Append every non-trivial error encountered during development, with its fix.
> Claude Code: update this file whenever you debug something that took more than one attempt.

---

## Known Issues & Fixes

<!-- Claude Code appends here -->
<!-- Example format:

### [2026-06-13] Monaco editor not highlighting current line
**Error:** Decorations API requires editor instance ref, not just line number prop
**Fix:** Used `editor.deltaDecorations()` inside a `useEffect` watching `currentLine`
**File:** frontend/src/components/Editor/CodeEditor.tsx

-->

### [2026-06-13] window.monaco global hack in CodeEditor
**Error:** Initial CodeEditor used `(window as unknown as {monaco}).monaco.Range(...)` which is not type-safe and fails if the global isn't set before the effect runs.
**Fix:** Added `monacoRef = useRef<typeof Monaco | null>(null)` and set it in `onMount`. The useEffect that applies decorations reads from `monacoRef.current` instead of the window global.
**File:** frontend/src/components/Editor/CodeEditor.tsx

### [2026-06-13] useState misused as useEffect for store initialization in App.tsx
**Error:** `useState(() => { setCode(DEFAULT_CODE) })` — calling a Zustand store action inside a useState initializer runs on every render and triggers a React warning (state update during render).
**Fix:** Replaced with `useEffect(() => { setCode(DEFAULT_CODE) }, [])` to run only once after mount.
**File:** frontend/src/App.tsx

### [2026-06-13] Sandbox environment npm installs timing out (development environment only)
**Error:** `npm install` in the Linux sandbox times out at 45s, leaving `node_modules/` with truncated packages (e.g., TypeScript missing `lib/tsc.js`, Vite missing `bin/vite.js`). This does NOT affect production — running `npm install` on a real machine completes successfully.
**Fix:** The sandbox was used only for backend Python testing (which worked). Frontend TypeScript was verified via manual code review. Run `npm install` fresh on your local machine before `npm run dev`.
**Note:** package.json has all correct dependencies listed; `node_modules/` can be deleted and reinstalled safely.

### [2026-06-13] tracer.py corrupted by Write/Edit tool truncation + null bytes
**Error:** Two separate corruption events:
1. The `Write` tool truncated `tracer.py` mid-line at the `trace_code` return type annotation (`-> tuple[list[`), leaving an unclosed bracket and a SyntaxError.
2. A `cat >>` append added the correct code but left 38 trailing null bytes (`\x00`), causing `ast.parse` to raise `ValueError: source code string cannot contain null bytes`.
**Fix:**
1. Used `sed -i '263d'` to remove the truncated duplicate line.
2. Used Python to strip trailing null bytes: `data.rstrip(b'\x00')` written back in binary mode.
3. Verified with `python -B -c "import ast; ast.parse(...)"` → OK.
4. Verified functional test: `trace_code(twoSum_code, ...)` returns 15 steps, no error.
**File:** backend/services/tracer.py
**Prevention:** When writing large files, prefer a single `Write` tool call over `Edit` for the final block. Always verify with `ast.parse` after any tracer.py edit.

### [2026-06-13] tracer.py _snapshot_call_stack had unused `total` variable
**Error:** `total = len(self._user_stack)` was assigned but never read — violates PEP8 (W0612).
**Fix:** Removed the unused assignment.
**File:** backend/services/tracer.py

### [2026-06-13] Write tool corrupts files containing Unicode box-drawing characters in comments
**Error:** When the Write tool writes a file containing Unicode box-drawing characters (e.g. `─` U+2500, encoded as `\xe2\x94\x80`), the file is truncated at the first occurrence of that byte sequence and the remaining bytes are filled with repetitions of `\xe2\x94\x80`. The result is a file that appears valid in the in-context state but is broken on disk (the Python `codecs` library raises `UnicodeDecodeError: unexpected end of data`).
**Root cause:** The Write tool's streaming to disk seems to misinterpret the multi-byte UTF-8 sequence as a truncation marker under certain conditions.
**Fix:** Rewrite the file using `cat > file << 'EOF' ... EOF` in bash with plain ASCII characters. Replace `──` comment decorations with plain `---` dashes.
**Prevention:** Never use Unicode box-drawing or other multi-byte decorative characters in source file comments when using the Write tool. Stick to plain ASCII in all comments.
**Files affected:** frontend/src/lib/api.ts (discovered; fixed with bash cat heredoc)

### [2026-06-14] LeetCode class methods fail with TypeError/NameError
**Error (TypeError):** Pasting `def maxArea(self, heights):` and calling `maxArea(heights)` raises `TypeError: maxArea() missing 1 required positional argument: 'heights'` because Python maps `heights` to `self` and then finds the second positional argument missing.
**Error (NameError):** Pasting LeetCode code where the call site uses a different name (e.g. `maxAmount(heights)` but function is `maxArea`) raises `NameError: name 'maxAmount' is not defined`. Users copy-paste snippets and mistype the call site.
**Fix:** Added `backend/services/preprocessor.py` with three transforms applied before tracing:
1. Strip `self`/`cls` from all `def` parameter lists via regex
2. Strip PEP 484 type annotations (`List[int]`, `Optional[...]`, `-> int`, etc.) using bracket-depth-aware parser
3. Auto-rewrite the call site function name if it doesn't match any defined function and exactly one function is defined
**Result:** The preprocessor notes what it changed and returns a `notes` list in `TraceResponse`. The frontend shows a blue "Auto-fixed: ..." banner.
**Files:** backend/services/preprocessor.py (new), backend/services/tracer.py, backend/routers/trace.py, backend/models/schemas.py, frontend/src/types/trace.ts, frontend/src/store/traceStore.ts, frontend/src/App.tsx

### [2026-06-15] ArrayVisualizer.tsx existed but was never imported/rendered
**Error:** Phase 2 created `ArrayVisualizer.tsx` and `pointerDetector.ts` (pointer-arrow array cells) but `App.tsx` was never updated to render them — the component was dead code. The Phase 5 testing checklist requires "pointer arrows on nums, left/right highlighted" for Two Sum and Binary Search, which was impossible without this wiring.
**Fix:** Added `frontend/src/components/Visualizer/ArrayPanel.tsx`, which iterates over array-typed locals in the current step, computes `buildPointerIndices`, and renders `ArrayVisualizer` per array. Wired into `App.tsx` as a new "Arrays" sidebar section (only rendered when the current step has array locals).
**Files:** frontend/src/components/Visualizer/ArrayPanel.tsx (new), frontend/src/App.tsx

### [2026-06-15] lucide-react@^0.383.0 incompatible with React 19
**Error:** `npm install lucide-react@^0.383.0` failed with `ERESOLVE` — that version's peer dependency caps React at ^18.0.0, but the project uses React 19.2.
**Fix:** Installed `lucide-react@^0.500.0` instead, which supports React 19.
**File:** frontend/package.json

### [2026-06-15] npm/PowerShell cwd defaults differ between Bash and PowerShell tools
**Error:** In this environment, the Bash tool's default working directory is `frontend/`, while PowerShell's default is also `frontend/` — running `cd frontend && ...` from either fails with "No such file or directory" / "Cannot find path" since `frontend/frontend` doesn't exist.
**Fix:** Run frontend commands (npm install, npm run build/dev) without a leading `cd frontend`. For backend commands, use an explicit absolute or `cd ../backend` style path.
**Note:** Verify cwd assumptions before chaining `cd` in either shell for this project.

### [2026-06-15] VariablePanel.tsx VarRow had unused `stepKey` prop (TS6133)
**Error:** `npm run build` (vite/esbuild) didn't catch it, but `tsc --noEmit` failed with "'stepKey' is declared but its value is never read" — a pre-existing unused prop passed to `VarRow` from Phase 5's rewrite.
**Fix:** Removed `stepKey` from `VarRow`'s props/type and from both call sites; the local `stepKey` used for React `key` generation in `VariablePanel` itself was kept.
**File:** frontend/src/components/Visualizer/VariablePanel.tsx
**Prevention:** Run `npx tsc --noEmit -p tsconfig.app.json` after frontend changes, not just `npm run build`, since vite's esbuild transform skips type-only errors.
