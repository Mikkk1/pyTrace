# PyTrace — Architecture

> Do not modify this file. It is the source of truth for all technical decisions.

---

## Stack Decisions (Final)

| Concern | Choice | Reason |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast dev server, your existing stack |
| Styling | TailwindCSS v3 | Utility-first, no CSS files to manage |
| Code editor | Monaco Editor (`@monaco-editor/react`) | VS Code engine, best Python highlighting |
| State management | Zustand | Lightweight, no boilerplate vs Redux |
| Backend framework | FastAPI | Async, auto docs, your existing stack |
| Execution tracer | `sys.settrace()` in sandboxed subprocess | Capture full variable state per line |
| Complexity analysis | Anthropic Claude API (`claude-sonnet-4-6`) | Smart Big-O with pattern recognition |
| Snippet storage | Supabase | Already in your stack, free tier sufficient |
| Deployment | Vercel (frontend) + Railway (backend) | Free tiers, zero-config |

---

## Folder Structure

```
code_visualizer/
├── CLAUDE.md
├── PRD.md
├── ARCHITECTURE.md
├── TASK_LOG.md
├── ERRORS.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── CodeEditor.tsx        ← Monaco editor, line highlight
│   │   │   │   └── TestCaseInput.tsx     ← Input panel for fn args
│   │   │   ├── Visualizer/
│   │   │   │   ├── VariablePanel.tsx     ← Variable state at current step
│   │   │   │   ├── ArrayVisualizer.tsx   ← Array cells + pointer arrows
│   │   │   │   ├── CallStack.tsx         ← Stack frames display
│   │   │   │   └── ComplexityPanel.tsx   ← Big-O result display
│   │   │   ├── Controls/
│   │   │   │   └── StepControls.tsx      ← Play/pause/next/back/speed
│   │   │   └── Layout/
│   │   │       ├── Header.tsx
│   │   │       └── AppLayout.tsx
│   │   ├── store/
│   │   │   └── traceStore.ts             ← Zustand store for trace state
│   │   ├── hooks/
│   │   │   ├── useTracer.ts              ← Run trace, poll steps
│   │   │   └── usePlayback.ts            ← Auto-play with speed control
│   │   ├── lib/
│   │   │   ├── api.ts                    ← Axios calls to FastAPI
│   │   │   ├── supabase.ts               ← Supabase client
│   │   │   └── pointerDetector.ts        ← Auto-detect pointer variables
│   │   ├── types/
│   │   │   └── trace.ts                  ← TypeScript types for trace frames
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
└── backend/
    ├── main.py                           ← FastAPI app entry point
    ├── routers/
    │   ├── trace.py                      ← POST /trace endpoint
    │   ├── analyze.py                    ← POST /analyze endpoint
    │   └── snippets.py                   ← POST/GET /snippets endpoints
    ├── services/
    │   ├── tracer.py                     ← sys.settrace() engine
    │   ├── sandbox.py                    ← Security: subprocess + restrictions
    │   └── complexity.py                 ← Claude API call for Big-O
    ├── models/
    │   └── schemas.py                    ← Pydantic request/response models
    ├── requirements.txt
    └── .env
```

---

## Key Data Types

### TraceStep (used everywhere)
```typescript
// frontend/src/types/trace.ts
export interface TraceStep {
  line: number;
  locals: Record<string, unknown>;
  call_stack: Array<{ name: string; line: number; depth: number }>;
  event: 'line' | 'call' | 'return' | 'exception';
  return_value?: unknown;
  changed_vars: string[];   // vars that differ from previous step
}

export interface TraceResult {
  steps: TraceStep[];
  total_steps: number;
  error?: string;
}
```

```python
# backend/models/schemas.py
from pydantic import BaseModel
from typing import Any

class TraceRequest(BaseModel):
    code: str
    inputs: dict[str, Any]

class StackFrame(BaseModel):
    name: str
    line: int
    depth: int

class TraceStep(BaseModel):
    line: int
    locals: dict[str, Any]
    call_stack: list[StackFrame]
    event: str
    return_value: Any = None
    changed_vars: list[str] = []

class TraceResponse(BaseModel):
    steps: list[TraceStep]
    total_steps: int
    error: str | None = None
```

---

## Tracer Engine Design

The backend tracer works in three stages:

**Stage 1 — Sandbox:** Spawn a restricted subprocess with a timeout (5s). Block dangerous modules before exec.

**Stage 2 — Trace:** Use `sys.settrace()` to intercept every `line`, `call`, and `return` event. At each event, snapshot `frame.f_locals` and the call stack.

**Stage 3 — Serialize:** Convert the list of snapshots to JSON-safe objects (handle sets, custom objects, etc.) and return.

```python
# Simplified tracer core (backend/services/tracer.py)
import sys
import copy

steps = []

def trace_calls(frame, event, arg):
    if event in ('line', 'call', 'return'):
        steps.append({
            'line': frame.f_lineno,
            'locals': serialize(copy.deepcopy(frame.f_locals)),
            'event': event,
            'call_stack': get_stack(frame),
            'return_value': serialize(arg) if event == 'return' else None,
        })
    return trace_calls

sys.settrace(trace_calls)
exec(user_code, restricted_globals)
sys.settrace(None)
```

---

## Pointer Auto-Detection Logic

```typescript
// frontend/src/lib/pointerDetector.ts
const POINTER_NAMES = ['i', 'j', 'k', 'l', 'r', 'left', 'right', 'lo', 'hi',
                       'start', 'end', 'ptr', 'slow', 'fast', 'mid', 'top', 'bot'];

export function detectPointers(locals: Record<string, unknown>): string[] {
  return Object.keys(locals).filter(key =>
    POINTER_NAMES.includes(key) && typeof locals[key] === 'number'
  );
}
```

---

## Supabase Schema

```sql
-- Run this in your Supabase SQL editor
create table snippets (
  id uuid default gen_random_uuid() primary key,
  token text unique not null,
  code text not null,
  inputs jsonb not null default '{}',
  initial_step int not null default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

create index on snippets(token);
create index on snippets(expires_at);
```

---

## API Contract

### POST /trace
```
Request:  { code: string, inputs: { [arg]: value } }
Response: { steps: TraceStep[], total_steps: number, error?: string }
Timeout:  10s (Railway) / 5s (code execution limit)
```

### POST /analyze
```
Request:  { code: string }
Response: { time: string, space: string, pattern: string, explanation: string }
```

### POST /snippets
```
Request:  { code: string, inputs: object, initial_step: number }
Response: { token: string, url: string }
```

### GET /snippets/{token}
```
Response: { code: string, inputs: object, initial_step: number }
```

---

## Security Constraints (Non-Negotiable)

Implement these in `backend/services/sandbox.py`:

```python
BLOCKED_MODULES = ['os', 'subprocess', 'sys', 'socket', 'shutil',
                   'pathlib', 'importlib', 'ctypes', 'multiprocessing']

BLOCKED_BUILTINS = ['open', 'eval', 'exec', 'compile', '__import__']

MAX_CODE_LENGTH = 5000      # characters
EXECUTION_TIMEOUT = 5       # seconds
MAX_STEPS = 10000           # prevent infinite loops
RATE_LIMIT = 20             # requests per IP per minute
```

---

## Frontend Packages

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@monaco-editor/react": "^4.6.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "@supabase/supabase-js": "^2.43.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0"
  }
}
```

## Backend Packages

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
anthropic==0.28.0
supabase==2.5.0
python-dotenv==1.0.1
pydantic==2.7.0
slowapi==0.1.9
```

---

## Deployment Config

### Vercel (frontend)
- Build command: `npm run build`
- Output directory: `dist`
- Env vars: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Railway (backend)
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_ORIGINS`
