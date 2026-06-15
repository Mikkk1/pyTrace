# PyTrace — Final Polish, Branding & Deployment Prompt

> Paste this into Claude Code as your next session prompt after Phase 4 is complete.

---

## Copy-Paste Prompt:

```
Read CLAUDE.md, TASK_LOG.md, and ARCHITECTURE.md before starting.

We are now doing Phase 5: Branding, UI Polish, Dockerization, and Deployment.

---

### 1. DEVELOPER BRANDING — Add to the app footer and header

Add a minimal, elegant "Built by" section to the app. Use the following details:

Name: Sarim Zahid
Role: AI/ML Engineer
Email: sayhitosarim@gmail.com
LinkedIn: https://linkedin.com/in/sarim-zahid-4b3636265
GitHub: https://github.com/Mikkk1

Placement:
- In the Header (top right): show small GitHub and LinkedIn icon buttons (use lucide-react icons) that open in a new tab
- In the Footer (bottom of page): one line — "Built by Sarim Zahid · sayhitosarim@gmail.com · GitHub · LinkedIn"
- Style: subtle, monospace font, muted color — should not compete with the main UI
- Do NOT use a loud banner. Keep it minimal like a developer portfolio footer.

---

### 2. UI IMPROVEMENTS

Step Controls:
- Constrain the entire step controls bar to max 50% width, centered on screen
- Speed slider should be compact and inline with the buttons
- Use lucide-react icon buttons (Play, Pause, SkipForward, SkipBack, RotateCcw) with tooltips on hover
- Show "Step X / Y" as a small badge

Variable Panel:
- Show ALL variables in scope including temporaries
- For arrays/lists: expand each index explicitly — nums[0] = 2, nums[1] = 7, etc.
- For nested structures: expand each level
- Highlight in amber any variable READ or WRITTEN on the current line
- Variables going out of scope: show grayed out with strikethrough for one step before removing
- Dark theme, monospace font for all values
- Smooth highlight flash transition when values change between steps

Layout:
- Code editor left, all visualization panels right in a scrollable column
- Panels have clear visual separation with subtle borders
- Overall dark theme, developer-focused aesthetic

---

### 3. DOCKERIZATION

Create the following Docker setup:

**backend/Dockerfile:**
- Base image: python:3.11-slim
- Install requirements.txt
- Expose port 8000
- CMD: uvicorn main:app --host 0.0.0.0 --port 8000

**frontend/Dockerfile:**
- Multi-stage build
- Stage 1 (builder): node:20-alpine, npm install, npm run build
- Stage 2 (serve): nginx:alpine, copy dist/ from builder
- Expose port 80

**docker-compose.yml (root level):**
- Services: frontend (port 3000→80), backend (port 8000→8000)
- Environment variables loaded from .env files
- Both services on the same network
- backend depends_on frontend: false (they are independent)

**docker-compose.prod.yml:**
- Same as above but with restart: always on both services
- Remove volume mounts (prod uses built images only)

**.dockerignore (both frontend and backend):**
- node_modules, __pycache__, .env, venv, .git, dist

---

### 4. DEPLOYMENT

Deploy to Render.com (free tier, supports Docker):

**backend/render.yaml:**
```yaml
services:
  - type: web
    name: pytrace-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: ALLOWED_ORIGINS
        sync: false
```

**frontend — deploy to Vercel:**
- Add vercel.json to frontend/:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- Set VITE_API_URL in Vercel dashboard to the Render backend URL after deploy

---

### 5. TESTING CHECKLIST

Before marking deployment complete, verify all 5 test cases work end-to-end:

1. Two Sum — nums = [2,7,11,15], target = 9
   - Expect: pointer arrows on nums, left/right highlighted, result returned at correct step

2. Binary Search — nums = [-1,0,3,5,9,12], target = 9
   - Expect: mid pointer updates each iteration, lo/hi converge

3. Merge Sort — arr = [38,27,43,3,9,82,10]
   - Expect: recursive call stack visible, subarrays shown at each merge step

4. Fibonacci (recursive) — n = 6
   - Expect: call stack depth increases/decreases correctly, return values shown

5. BFS — graph = {0:[1,2], 1:[3], 2:[3], 3:[]}, start = 0
   - Expect: queue variable shown as array, visited set visible at each step

Log each test result in TASK_LOG.md.
Log any bugs found and fixed in ERRORS.md.

---

### 6. FINAL CHECKS

- All .env values use environment variables — no hardcoded secrets anywhere
- README.md created at root with: project description, local setup instructions, live demo link placeholder, and Sarim's contact info
- All console.log debug statements removed from frontend
- Backend rate limiting active (slowapi, 20 req/min/IP)
- CORS locked to ALLOWED_ORIGINS env var (not wildcard *)

After everything is complete, output a deployment summary:
- Frontend URL
- Backend URL  
- Share link test (create one snippet and verify the URL loads correctly)
```
