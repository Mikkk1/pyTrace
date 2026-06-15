# PyTrace — Phase 6 Prompt

> Paste this into Claude Code after Phase 5 is complete.

```
Read CLAUDE.md, TASK_LOG.md, and ERRORS.md before starting.

This is Phase 6: Live REPL Mode + Visualization Panel Overhaul.
Complete all sections in order. Append to TASK_LOG.md after each completed item.

---

## SECTION A — FIX DUPLICATE ARRAY DISPLAY

Right now arrays appear twice in the sidebar:
- Once in the ARRAYS section as a visual cell grid (ArrayVisualizer)
- Again in the VARIABLES section as nums[0]=..., nums[1]=... rows (VariablePanel)

This is redundant. Fix it as follows:

- ARRAYS section (ArrayVisualizer): keep the visual cell grid — this is the PRIMARY display for arrays/lists
- VARIABLES section (VariablePanel): remove the index expansion rows (nums[0], nums[1]...) for any variable that is already rendered by ArrayVisualizer
- VariablePanel should still show the array variable name + type badge (e.g. "nums  Array[6]") as a non-expandable summary row, but NOT re-list every index
- Scalars, dicts, sets, booleans, strings stay fully expanded in VariablePanel as before
- Result: each array appears ONCE visually (as grid) and ONCE as a summary label — no duplication

---

## SECTION B — VISUALIZATION PANEL OVERHAUL

The right sidebar is too narrow and cramped. Redesign it as follows:

### Layout change
- The sidebar must take up at minimum 45% of total screen width by default (up from ~30%)
- The drag handle between editor and sidebar must still work, range: editor min 25% — sidebar min 40%
- All sections inside the sidebar are independently resizable vertically using drag handles between them

### Sections inside the sidebar (top to bottom):
1. ARRAYS — shows ArrayVisualizer for all array/list variables
2. VARIABLES — shows scalars, dicts, sets, strings (no arrays — see Section A)
3. CALL STACK — shows stack frames
4. COMPLEXITY — collapsible, stays at bottom

### Each section must:
- Have a header bar with: section label (left) + collapse toggle chevron (right)
- Be collapsible — clicking the chevron collapses it to just the header bar
- Have a drag handle at its bottom border to resize it vertically (min height 60px)
- Remember collapsed/expanded state in Zustand store (persist across steps)
- When collapsed, other sections expand to fill the freed space

### Section sizing defaults:
- ARRAYS: 30% of sidebar height
- VARIABLES: 35% of sidebar height  
- CALL STACK: 20% of sidebar height
- COMPLEXITY: 15% of sidebar height (collapsed by default)

---

## SECTION C — LIVE REPL MODE

Add a new mode toggle in the Header: "Trace Mode" (current) vs "Live Mode" (new).

### What Live Mode does:
- The code editor becomes a live scratchpad
- Every time the user stops typing (debounce: 600ms), the backend automatically re-runs the entire code and updates all visualizations in real time — no "Run" button needed
- The visualization always shows the FINAL state of all variables (last step of the trace), not a specific step
- Step controls are hidden in Live Mode — there are no steps to navigate, just the live final state
- If the code has a syntax error or runtime error, show a red error banner with the message but do NOT clear the current visualization

### What stays the same in Live Mode:
- ArrayVisualizer still shows all arrays
- VariablePanel still shows all scalars/dicts/etc
- CallStack shows the final call stack state
- TestCaseInput still works — changing inputs also triggers a re-run

### Implementation:
- Add `mode: 'trace' | 'live'` to Zustand traceStore
- Add mode toggle button in Header (two-segment pill button: "Trace | Live")
- In Live Mode, useTracer hook fires automatically on code change (debounced 600ms) and on input change
- In Live Mode, after trace completes, auto-jump to the last step: `setCurrentStep(steps.length - 1)`
- Show a small pulsing green dot in the header when Live Mode is active and re-running
- Show "Live" badge next to step indicator replacing "Step X / Y"

### Keyboard shortcut:
- Ctrl+Shift+L toggles between Trace and Live mode

---

## SECTION D — GENERAL POLISH

- In the ARRAYS section header, show the count of arrays currently in scope: "ARRAYS (2)"
- In the VARIABLES section header, show the count of non-array variables: "VARIABLES (4)"  
- Array cell grid: if an array has more than 12 elements, show the first 10 cells + "...+N more" button that expands inline
- Pointer arrows below array: if two pointers are on the same index, stack the labels vertically instead of overlapping
- In Live Mode, the editor background should have a very subtle green tint (#1e2a1e) to visually signal the mode

---

## TESTING

After all sections are complete, test these scenarios:

1. Two Sum in Trace Mode — verify nums appears once (grid only, no duplicate index rows in Variables)
2. Two Sum in Live Mode — change target value in TestCaseInput, verify visualization updates within 1 second
3. Type a syntax error in Live Mode — verify red banner appears, old visualization stays
4. Collapse ARRAYS section — verify VARIABLES + CALL STACK expand to fill space
5. Resize ARRAYS section drag handle — verify it snaps to min 60px and does not overlap adjacent section

Log each test result in TASK_LOG.md.
Log any bugs and fixes in ERRORS.md.
```
