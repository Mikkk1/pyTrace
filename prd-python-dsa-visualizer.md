# PRD: PyTrace — Python DSA Code Visualizer

**Version:** 1.0  
**Author:** Sarim (ScalePact AI)  
**Date:** June 2026  
**Status:** Draft

---

## 1. Overview

PyTrace is a web-based Python code execution visualizer built for DSA interview prep (NeetCode 150 / LeetCode). It lets you paste Python code, define custom test cases, and step through execution line by line — watching variable states, array contents, pointer positions, and call stack evolve in real time.

Think Python Tutor, but faster, cleaner, and designed specifically for the kinds of problems you encounter in FAANG-style interviews.

---

## 2. Problem Statement

Interview prep tools like NeetCode's visualizer are either paywalled or too general. Python Tutor is slow, ugly, and doesn't handle DSA-specific patterns well (two pointers, sliding window, recursion trees, etc.). There's no fast, free, modern tool that gives you a real-time visual trace of a LeetCode solution as it runs.

---

## 3. Goals

- Paste any Python solution → trace it step by step with full state visibility
- Support custom test case input without editing the code
- Visualize variables, arrays, pointers, and call stack at every execution step
- Allow forward/backward stepping, speed-controlled playback, and shareable links
- Provide Big-O complexity analysis as a bonus layer

---

## 4. Non-Goals (v1)

- No multi-language support (Python only)
- No user authentication or accounts in v1 (snippets use anonymous share tokens)
- No collaborative editing
- No execution of system-level or file I/O code

---

## 5. Users

**Primary:** AI/ML and CS graduates preparing for technical interviews, specifically working through NeetCode 150 or similar curated problem sets.

**Secondary:** CS students learning algorithms for the first time.

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), TailwindCSS, Monaco Editor |
| Backend | FastAPI (Python) |
| Execution Engine | Python `sys.settrace()` + `bdb` module |
| Complexity Analysis | LLM call (Claude API) or static heuristic |
| Deployment | Frontend → Vercel, Backend → Railway or Render |
| Snippet Storage | Supabase (anonymous tokens, no auth) |

---

## 7. Feature Specifications

### 7.1 Code Editor Panel

- Monaco Editor (same engine as VS Code) with Python syntax highlighting
- Line numbers visible at all times
- **Current line highlighted** in real time as the tracer steps through
- Paste-friendly, no forced formatting

### 7.2 Test Case Input UI

- Separate panel below or beside the editor
- Input fields labeled per function argument (auto-detected from function signature)
- Supports: integers, strings, lists, nested lists, dicts
- "Run with these inputs" button triggers the tracer
- Example preloaded: `nums = [2,7,11,15], target = 9`

### 7.3 Execution Tracer (Backend)

Built using Python's `sys.settrace()` to capture state at every line execution:

- **Captured per step:**
  - Line number currently executing
  - All local variables and their values
  - Call stack (function name + depth)
  - Return values when a function exits

- Each step is serialized to JSON and returned as an ordered list of frames
- The frontend receives the full trace on "Run", then navigates it client-side (no repeated backend calls while stepping)

### 7.4 Variable State Panel

- Displays all variables in scope at the current step
- Value types rendered distinctly:
  - Scalars: plain value display
  - Lists/arrays: rendered as horizontal cells with index labels
  - Dicts: key-value grid
  - Booleans: colored badge (green/red)
- Variables that changed since the last step are highlighted

### 7.5 Array / List Visualization

- Arrays rendered as a row of labeled boxes
- Pointer/index variables that point into an array are shown as arrows beneath the array
- Two-pointer patterns auto-detected (e.g., `left`, `right`, `i`, `j`) and rendered with distinct colors
- Sliding window highlighted as a shaded range

### 7.6 Call Stack Viewer

- Stack frames listed top-to-bottom
- Each frame shows: function name, line number, local variable count
- Recursion depth shown as a badge
- Frames animate in/out as functions are called and returned

### 7.7 Step Controls

| Control | Behavior |
|---|---|
| ▶ Play | Auto-advance through steps at current speed |
| ⏸ Pause | Pause auto-play |
| → Next Step | Advance one execution step |
| ← Prev Step | Go back one step (undo) |
| ⏭ Step Over | Skip into next line (skip function internals) |
| Speed Slider | 0.25x → 4x playback speed |
| Reset | Return to step 0 |

### 7.8 Share Snippets

- "Share" button generates a unique URL (e.g., `pytrace.app/s/abc123`)
- Stores: code + test case inputs + current step index
- Stored in Supabase with a short random token (no login required)
- Links expire after 30 days (configurable)

### 7.9 Big-O Complexity Analysis

- Triggered by a "Analyze Complexity" button (separate from Run)
- Sends code to Claude API with a structured prompt
- Returns:
  - Time complexity with explanation
  - Space complexity with explanation
  - Displayed as a collapsible panel below the editor
- Optional: identify the algorithmic pattern (two pointers, BFS, DP, etc.)

---

## 8. UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  PyTrace                              [Share] [Analyze O(n)] │
├──────────────────────────┬──────────────────────────────────┤
│                          │  VARIABLE STATE                   │
│   CODE EDITOR            │  left = 0  right = 3             │
│   (Monaco)               │  nums = [2, 7, 11, 15]           │
│                          │           ↑         ↑            │
│   → line 4 highlighted   │  target = 9                       │
│                          │                                   │
│                          ├──────────────────────────────────┤
│                          │  CALL STACK                       │
│                          │  twoSum() — line 4               │
│                          │  <module> — line 8               │
├──────────────────────────┴──────────────────────────────────┤
│  TEST CASE INPUT                                             │
│  nums: [2,7,11,15]   target: 9          [▶ Run]             │
├─────────────────────────────────────────────────────────────┤
│  [◀◀ Reset] [← Back] [▶ Play] [Next →] [Speed: ━●━━ 1x]   │
│  Step 4 / 23                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/trace` | Accepts code + inputs, returns full step trace as JSON |
| `POST` | `/analyze` | Accepts code, returns Big-O analysis via LLM |
| `POST` | `/snippets` | Saves code + inputs to Supabase, returns share token |
| `GET` | `/snippets/{token}` | Retrieves a saved snippet by token |

### `/trace` Request Shape
```json
{
  "code": "def twoSum(nums, target):\n    ...",
  "inputs": {
    "nums": [2, 7, 11, 15],
    "target": 9
  }
}
```

### `/trace` Response Shape
```json
{
  "steps": [
    {
      "line": 2,
      "locals": { "nums": [2,7,11,15], "target": 9, "left": 0 },
      "call_stack": [{ "name": "twoSum", "line": 2 }],
      "event": "line"
    },
    ...
  ],
  "total_steps": 23
}
```

---

## 10. Security Constraints

- All user code runs in a sandboxed subprocess with:
  - Timeout: 5 seconds max
  - No file system access
  - No network access (`socket` module blocked)
  - No `os`, `subprocess`, `sys.exit` calls permitted
- Input size limit: 5,000 characters of code
- Rate limit: 20 trace requests per IP per minute

---

## 11. Milestones

| Phase | Scope | Target |
|---|---|---|
| Phase 1 | Tracer engine + variable state panel + line highlight | Week 1–2 |
| Phase 2 | Array visualization + pointer arrows + call stack | Week 3 |
| Phase 3 | Step controls (play/pause/back/speed) + test case UI | Week 4 |
| Phase 4 | Share snippets (Supabase) + Big-O analysis (Claude API) | Week 5 |
| Phase 5 | Deploy (Vercel + Railway) + polish + performance | Week 6 |

---

## 12. Success Metrics

- Trace executes and returns in < 500ms for typical LeetCode solutions
- Step navigation feels instant (client-side, no backend calls per step)
- Share links load in < 1s
- Works correctly on at minimum: Two Sum, Binary Search, Merge Sort, Fibonacci (recursive), BFS/DFS

---

## 13. Open Questions

1. Should we use Pyodide (Python in browser via WASM) for the tracer instead of a FastAPI backend? This would eliminate sandboxing complexity and make deploys simpler — but limits certain stdlib modules.
2. For the pointer/arrow detection — should this be purely visual (any variable named `i`, `j`, `left`, `right`, `ptr` auto-rendered as pointer) or should we let users manually tag pointer variables?
3. Should the share link capture the current step, so you can share a specific moment in the trace?
