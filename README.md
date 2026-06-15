# PyTrace

A Python DSA (Data Structures & Algorithms) code visualizer built for interview prep.
Paste a Python function (including LeetCode-style class methods), supply inputs,
and step through a line-by-line execution trace with live variable state, array
pointer arrows, call stack depth, and AI-generated Big-O complexity analysis.

## Features

- Step-by-step execution trace (`sys.settrace()`-based) with play/pause/scrub controls
- Array visualizer with auto-detected pointer arrows (`i`, `j`, `left`, `right`, `lo`, `hi`, `mid`, ...)
- Variable panel: expanded array indices, dict entries, amber flash on change, out-of-scope strikethrough
- Recursive call stack visualization
- Big-O time/space complexity analysis via any OpenAI-compatible LLM (Groq, OpenRouter, OpenAI)
- Shareable snippet links via Supabase
- Sandboxed code execution (blocked modules/builtins, timeouts, step limits)

## Live Demo

- Frontend: _TODO: add Vercel deployment URL_
- Backend: _TODO: add Render deployment URL_

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your values
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # fill in your values
npm run dev
```

The frontend runs at `http://localhost:5173` and expects the backend at
`http://localhost:8000` (configurable via `VITE_API_URL`).

## Running with Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

For production (restart policies, no dev volume mounts):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Environment Variables

### Backend (`backend/.env`)

```
LLM_API_KEY=...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=...
SUPABASE_KEY=...
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deployment

- **Backend**: Docker image, deployable to Render (see `backend/render.yaml`)
- **Frontend**: Vercel (see `frontend/vercel.json`) — set `VITE_API_URL` to your
  deployed backend URL in the Vercel dashboard

## Contact

Built by **Sarim Zahid** — AI/ML Engineer

- Email: [sayhitosarim@gmail.com](mailto:sayhitosarim@gmail.com)
- GitHub: [github.com/Mikkk1](https://github.com/Mikkk1)
- LinkedIn: [linkedin.com/in/sarim-zahid-4b3636265](https://linkedin.com/in/sarim-zahid-4b3636265)
