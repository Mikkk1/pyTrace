# PyTrace — Claude Code Instructions

You are building **PyTrace**, a Python DSA code visualizer for interview prep.
Read `PRD.md` first before doing anything else. This file governs how you think, plan, and execute.

---

## Project Structure

```
code_visualizer/
├── CLAUDE.md              ← you are here
├── PRD.md                 ← product requirements
├── ARCHITECTURE.md        ← technical decisions and folder structure
├── TASK_LOG.md            ← append every completed task here
├── ERRORS.md              ← append every error and its fix here
├── frontend/              ← React + Vite app
└── backend/               ← FastAPI app
```

---

## Rules (follow strictly)

### Before writing any code
1. Read `PRD.md` fully
2. Read `ARCHITECTURE.md` fully
3. Check `TASK_LOG.md` to see what's already done — never redo completed work
4. Check `ERRORS.md` to avoid repeating known mistakes

### While coding
- Write one feature at a time — complete it, test it, log it, then move on
- Never leave a file half-written. If a function is stubbed, mark it with `# TODO(pytrace): ...`
- Always handle errors explicitly — no silent `except: pass` blocks
- After every meaningful change, append a one-line entry to `TASK_LOG.md`
- If you hit an error you had to debug, append it and its fix to `ERRORS.md`

### Code style
- Python: follow PEP8, use type hints everywhere, docstrings on all public functions
- TypeScript/React: functional components only, no class components
- Use `async/await` — no `.then()` chains
- No inline styles in React — use Tailwind classes only
- Keep components under 150 lines — split if larger

### What NOT to do
- Do not install packages not listed in `ARCHITECTURE.md` without noting it in `TASK_LOG.md`
- Do not modify `PRD.md` or `ARCHITECTURE.md`
- Do not skip the sandbox security checks in the tracer (see PRD section 10)
- Do not use `localStorage` — use Supabase for persistence

---

## How to run the project

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Backend `.env`:
```
ANTHROPIC_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
ALLOWED_ORIGINS=http://localhost:5173
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Session Start Checklist

Every time you start a new Claude Code session on this project:
1. `cat TASK_LOG.md` — review what's done
2. `cat ERRORS.md` — review known issues
3. Identify the next incomplete task from the PRD milestones
4. State your plan before writing code
5. Execute, test, log
