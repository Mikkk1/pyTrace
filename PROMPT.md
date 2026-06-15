# PyTrace — Claude Code Kickoff Prompt

> Paste this **exactly** as your first message when starting Claude Code inside the `code_visualizer/` folder.

---

## Kickoff Message (copy-paste this)

```
Read CLAUDE.md, PRD.md, and ARCHITECTURE.md fully before doing anything.

Then complete Phase 1 of the project as defined in PRD.md section 11:
- Set up the backend (FastAPI app, folder structure, requirements.txt, .env.example)
- Set up the frontend (Vite + React + TypeScript + Tailwind + Monaco Editor)
- Implement the tracer engine in backend/services/tracer.py using sys.settrace()
- Implement the sandbox in backend/services/sandbox.py with all security constraints from ARCHITECTURE.md
- Implement the POST /trace endpoint in backend/routers/trace.py
- Wire up the frontend to call /trace and display the step count and raw JSON in the console (visual UI comes in Phase 2)
- Implement line highlighting in the Monaco editor for the current step

After each file is completed, append to TASK_LOG.md.
If you hit any error that required debugging, append to ERRORS.md.

Do not start Phase 2 until Phase 1 is fully working and tested.
```

---

## Phase-by-Phase Prompts

After Phase 1 is complete, use these for subsequent sessions:

### Phase 2 Prompt
```
Read TASK_LOG.md to confirm Phase 1 is complete.
Read ARCHITECTURE.md for the component structure.

Implement Phase 2:
- VariablePanel.tsx: show all locals at current step, highlight changed vars
- ArrayVisualizer.tsx: render list/array variables as cells with index labels, detect pointer variables using pointerDetector.ts and render arrows
- CallStack.tsx: render call stack frames for the current step
- Connect all three panels to the Zustand traceStore
- The step controls (next/back only) should already move through the trace and update all panels

Log all completed files to TASK_LOG.md.
```

### Phase 3 Prompt
```
Read TASK_LOG.md to confirm Phase 2 is complete.

Implement Phase 3:
- StepControls.tsx: play, pause, next, back, reset, speed slider (0.25x–4x)
- usePlayback.ts hook: auto-advance steps using setInterval, respect speed setting
- TestCaseInput.tsx: parse the function signature from the code to auto-generate labeled input fields
- Wire TestCaseInput to the /trace API call

Log all completed files to TASK_LOG.md.
```

### Phase 4 Prompt
```
Read TASK_LOG.md to confirm Phase 3 is complete.

Implement Phase 4:
- backend/services/complexity.py: call Claude API (claude-sonnet-4-6) with the user's code, return time/space/pattern/explanation
- backend/routers/analyze.py: POST /analyze endpoint
- ComplexityPanel.tsx: collapsible panel showing Big-O result
- backend/routers/snippets.py + frontend/src/lib/supabase.ts: implement share snippet (POST /snippets, GET /snippets/{token})
- Share button in Header.tsx that calls /snippets and copies URL to clipboard
- On page load, check URL for ?s=TOKEN and hydrate state from Supabase

Log all completed files to TASK_LOG.md.
```

### Phase 5 Prompt
```
Read TASK_LOG.md to confirm Phase 4 is complete.

Implement Phase 5:
- Add vercel.json to frontend/
- Add Railway start command to backend/main.py (check for PORT env var)
- Add CORS config in backend/main.py using ALLOWED_ORIGINS env var
- Run through the 5 test cases from PRD section 12: Two Sum, Binary Search, Merge Sort, Fibonacci recursive, BFS
- Fix any bugs found during testing
- Final polish: loading states, error messages, empty states, mobile layout check

Log everything to TASK_LOG.md and any bugs to ERRORS.md.
```
