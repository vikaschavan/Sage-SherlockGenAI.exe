# Sage — Validation & Deployment Runbook

> **Audience**: Hackathon demo day + GCP Cloud Run deployment  
> **Stack**: Python 3.11 · Google ADK · Gemini 2.5 Flash · FastAPI · React + Vite · SQLite (local) / AlloyDB (GCP)

---

## 1. How the System Works

```
Browser (React at :5173)
        │
        │  POST /plan | /brief | /debrief
        ▼
FastAPI Server (:8000)
        │
        ▼
Google ADK Runner
        │
        ▼
OrchestratorAgent  (Gemini 2.5 Flash)
   ├── CalendarAgent   → Google Calendar API  (read events, create blocks, find free slots)
   ├── TaskAgent       → SQLite DB            (read/write tasks, priority ranking)
   ├── KnowledgeAgent  → DB keyword search    (meeting notes, knowledge chunks)
   ├── PlannerAgent    → synthesises context  (weekly plan, conflict resolution)
   └── NotificationAgent → Google Docs API   (create brief/summary docs)
```

### The three core flows

| Endpoint | Trigger | What Sage does |
|----------|---------|----------------|
| `POST /plan` | Week Planner screen "Ask Sage" | Reads Calendar events, queries Tasks DB, searches Knowledge Store, returns a prioritised weekly plan as markdown |
| `POST /brief` | Meeting Brief screen "click a meeting" | Searches Knowledge Store for related notes, creates a Google Doc brief, returns markdown + doc URL |
| `POST /debrief` | Debrief screen "Run Debrief" | Parses meeting notes, extracts action items as Tasks in DB, suggests calendar blocks, creates summary Doc |

### Data sources (local dev)
- **Google Calendar**: real OAuth — reads your actual calendar events
- **Tasks**: SQLite (`sage_local.db`) seeded from `data/mock_tasks.json` on every server startup
- **Knowledge/notes**: SQLite full-text search on `data/mock_notes/*.md` seeded on startup
- **Google Docs**: real OAuth — creates actual Google Docs in your Drive when `/brief` or `/debrief` runs

---

## 2. Prerequisites — One-Time Setup

### 2.1 Python environment

```bash
# From the project root (parent of the sage/ folder)
cd "d:/Office Data/Downloads/AIAceademy/Hackathon Prototype"

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

# Install the sage package in editable mode
cd sage
pip install -e .
pip install aiosqlite            # SQLite async driver (local dev only)
```

### 2.2 Auth credentials

Make sure these files exist:

| File | What it is |
|------|-----------|
| `sage/.env` | API keys and config (already created — DO NOT commit to git) |
| `sage/auth/client_secret.json` | Google OAuth desktop client credentials |
| `sage/token.json` | Auto-created on first run after OAuth browser flow |

### 2.3 Node / frontend

```bash
cd sage/frontend
npm install          # Only needed once
```

---

## 3. Local Validation — Step by Step

Run each step, confirm it passes before moving to the next.

---

### STEP 1 — Confirm Python package resolves

```bash
# From the Hackathon Prototype folder, with .venv active
python -c "import sage; print('OK')"
```

**Expected**: prints `OK`  
**If it fails**: run `pip install -e .` from inside the `sage/` folder

---

### STEP 2 — Start the backend API server

```bash
cd sage
uvicorn sage.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output** (first ~5 lines):
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**If it prompts for Google OAuth**: a browser window opens — log in with your Google account and approve the requested permissions. This writes `token.json` and only happens once.

---

### STEP 3 — Health check

```bash
curl http://localhost:8001/health
```

**Expected**:
```json
{"status": "ok", "service": "sage", "version": "0.1.0"}
```

---

### STEP 4 — Swagger UI (optional manual testing)

Open in browser: **http://localhost:8001/docs**

You will see three endpoints: `/plan`, `/brief`, `/debrief`. You can test them manually here with the "Try it out" button.

---

### STEP 5 — Test /plan endpoint

```bash
curl -X POST http://localhost:8001/plan \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What are my top priorities this week?\", \"user_id\": \"test\", \"session_id\": \"s1\"}"
```

**Expected**: A JSON response with `"reply": "..."` containing a markdown-formatted weekly plan that references the seeded tasks (Q2 Revenue Report, CloudOps Contract, etc.)

**Takes**: 10–30 seconds (Gemini API call + multi-agent reasoning)

---

### STEP 6 — Test /brief endpoint

```bash
curl -X POST http://localhost:8001/brief \
  -H "Content-Type: application/json" \
  -d "{\"event_title\": \"Product Review\", \"event_date\": \"2026-04-08\", \"attendees\": [\"alice@company.com\"]}"
```

**Expected**: JSON with `"reply": "..."` containing a pre-meeting brief markdown. If Google Docs scope is authorised, the reply will mention a Google Doc URL.

---

### STEP 7 — Test /debrief endpoint

```bash
curl -X POST http://localhost:8001/debrief \
  -H "Content-Type: application/json" \
  -d "{\"event_title\": \"Product Review\", \"event_date\": \"2026-04-08\", \"attendees\": [\"alice@company.com\"], \"notes\": \"Alice will send revised timeline. Bob to lead CloudOps call. Feature X delayed 2 weeks.\"}"
```

**Expected**: JSON with `"reply": "..."` listing extracted action items and suggested follow-ups.

---

### STEP 8 — Start the frontend

```bash
# New terminal window
cd "d:/Office Data/Downloads/AIAceademy/Hackathon Prototype/sage/frontend"
npm run dev
```

**Expected**: 
```
  VITE v8.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

### STEP 9 — End-to-end UI validation

| Screen | What to click / type | What you should see |
|--------|---------------------|---------------------|
| **Today** | Load the screen | MIT tasks listed (Q2 Report as "Frog"), protected morning block, Sage morning message in right panel |
| **Today → Sage panel** | Type "What should I focus on today?" → Enter | Sage responds with a task-aware suggestion (calls `/plan`) |
| **Week Planner** | Load the screen | 5-day grid with colour-coded day themes, metrics bar showing deep work % and meeting load |
| **Week Planner → Sage** | Type "Plan my week, I need 4 hours for the Q2 report" → Enter | Sage returns a full weekly plan as markdown |
| **Meeting Brief** | Click "Product Review" | Loading spinner, then a pre-meeting brief renders; click "Open in Google Docs" if a URL appears |
| **Debrief** | Click "Load sample notes" → "Run Debrief" | Action items extract, Ivy Lee prompt appears at bottom |
| **Insights** | Load the screen | Six metric rings, leader quote carousel, focus/meeting bar chart, Sage nudges |
| **Tasks** | Filter by "high" | Shows 4 high-priority tasks; click "Ask Sage to Prioritize" for AI re-ranking |

---

## 4. Deploying to Google Cloud Run

Cloud Run is a fully managed serverless container platform — ideal for this hackathon. You will deploy the **Python API** as one Cloud Run service and optionally serve the **React frontend** as static files from the same container or via Firebase Hosting.

### 4.1 Prerequisites — GCP setup

```bash
# Install gcloud CLI if not installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set your project
gcloud config set project my-first-project-t3

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

---

### 4.2 Store secrets in Secret Manager

Never bake credentials into container images. Store them in GCP Secret Manager:

```bash
# Google API Key
echo -n "AIzaSyD5jhZ_PXbkYjalhcEhXzgI2uyoKhLIVzM" | \
  gcloud secrets create GOOGLE_API_KEY --data-file=-

# OAuth client secret
gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=sage/auth/client_secret.json

# OAuth token (pre-authorised token.json from local run)
gcloud secrets create GOOGLE_TOKEN --data-file=sage/token.json

# API secret key
echo -n "4f5990e6f34f2fbd57b52895ed3f07ccb3df23d0350faf90e26a6eccb39bcb22" | \
  gcloud secrets create API_SECRET_KEY --data-file=-
```

---

### 4.3 Create a Dockerfile

Create `sage/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir aiosqlite

# Copy application code
COPY . .

# Install the sage package
RUN pip install --no-cache-dir -e .

# Copy mock data (needed for seeding on startup)
COPY data/ data/

# Expose port
EXPOSE 8080

# Start FastAPI with uvicorn on Cloud Run's expected port
CMD ["uvicorn", "sage.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

### 4.4 Create a .dockerignore

Create `sage/.dockerignore`:

```
__pycache__
*.pyc
*.pyo
.venv
*.egg-info
.env
token.json
auth/client_secret.json
sage_local.db
frontend/node_modules
frontend/dist
.git
```

---

### 4.5 Update settings for Cloud Run

For Cloud Run, set `USE_SQLITE=true` to keep using SQLite (AlloyDB migration is Phase 2). The key env var change is switching the OAuth flow — Cloud Run cannot open a browser.

Add this to `sage/auth/google_oauth.py` to support service account or pre-loaded token in production:

The `token.json` stored in Secret Manager will be mounted at runtime. Update `sage/config/settings.py` to read `google_token_file` from env:

```python
# In settings.py, the google_token_file field already exists:
google_token_file: str = "token.json"
# On Cloud Run, set GOOGLE_TOKEN_FILE=/secrets/token/token.json
```

---

### 4.6 Build and push the container

```bash
# From inside the sage/ directory
cd "d:/Office Data/Downloads/AIAceademy/Hackathon Prototype/sage"

# Build and push using Cloud Build (no local Docker needed)
gcloud builds submit \
  --tag gcr.io/my-first-project-t3/sage-api \
  --timeout=600s \
  .
```

This builds the image in the cloud and pushes it to Google Container Registry.

---

### 4.7 Deploy to Cloud Run

```bash
gcloud run deploy sage-api \
  --image gcr.io/my-first-project-t3/sage-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=false,USE_SQLITE=true,ENV=production" \
  --set-secrets "GOOGLE_API_KEY=GOOGLE_API_KEY:latest" \
  --set-secrets "API_SECRET_KEY=API_SECRET_KEY:latest"
```

**Note on OAuth token**: Cloud Run can't run a browser flow. Before deploying, copy your local `token.json` to Secret Manager and mount it:

```bash
# Upload your pre-authorised token
gcloud secrets create GOOGLE_TOKEN_JSON \
  --data-file=sage/token.json

# Add to the deploy command above:
# --set-secrets "GOOGLE_TOKEN_JSON=GOOGLE_TOKEN_JSON:latest"
# Then set GOOGLE_TOKEN_FILE=/secrets/GOOGLE_TOKEN_JSON/value in the app
```

After deploy, GCP prints:
```
Service URL: https://sage-api-xxxx-uc.a.run.app
```

---

### 4.8 Validate the Cloud Run deployment

```bash
# Replace with your actual Cloud Run URL
export SAGE_URL="https://sage-api-xxxx-uc.a.run.app"

# Health check
curl $SAGE_URL/health

# Plan test
curl -X POST $SAGE_URL/plan \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"What are my priorities this week?\", \"user_id\": \"demo\", \"session_id\": \"s1\"}"
```

---

### 4.9 Deploy the React frontend (Firebase Hosting)

Firebase Hosting is the fastest way to serve the static React build globally:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Build the frontend pointing to the Cloud Run backend
cd "d:/Office Data/Downloads/AIAceademy/Hackathon Prototype/sage/frontend"

# Update the API base URL for production
# Edit src/api/sage.js — change BASE_URL to your Cloud Run URL:
# const BASE_URL = "https://sage-api-xxxx-uc.a.run.app";

npm run build

# Login and init Firebase
firebase login
firebase init hosting
# Choose: "dist" as public dir, "Yes" to single-page app

# Deploy
firebase deploy
```

Firebase will give you a URL like `https://my-first-project-t3.web.app`.

---

### 4.10 Full production architecture (after deployment)

```
https://my-first-project-t3.web.app  (Firebase Hosting — React)
              │
              │  HTTPS POST /plan | /brief | /debrief
              ▼
https://sage-api-xxxx-uc.a.run.app  (Cloud Run — FastAPI)
              │
     ┌────────┴──────────┐
     ▼                   ▼
Google ADK          SQLite (local)
Gemini 2.5 Flash    ─── Phase 2: AlloyDB AI
     │
Google Workspace APIs (Calendar, Docs, Gmail, Drive)
```

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `ModuleNotFoundError: No module named 'sage'` | Package not installed in current venv | `cd sage && pip install -e .` |
| `google.auth.exceptions.RefreshError` | `token.json` expired or missing | Delete `token.json`, restart server — OAuth browser flow re-runs |
| `429 Resource Exhausted` from Gemini | Free tier quota (20 req/day) hit | Wait until next day, or enable billing on your GCP project |
| `CORS error` in browser | Backend not running or wrong port | Confirm `uvicorn` is on port 8000; CORS is already configured for `*` |
| Cloud Run: `ENOENT token.json` | Token not available at runtime | Mount `token.json` from Secret Manager or use service account auth |
| Cloud Run: container exits immediately | Startup error — missing env var | Check Cloud Run logs: `gcloud run logs read sage-api --region us-central1` |
| Frontend shows blank screen | Vite build error or wrong API URL | Check browser console; ensure `BASE_URL` in `src/api/sage.js` is correct |

---

## 6. Hackathon Demo Script

For the live demo, run these in order:

1. Open **http://localhost:5173** (or Firebase URL) — show the Today screen
2. Say: *"This is Sage's daily command center — the first 90 minutes of the day are protected, and the hardest task (Q2 Report) is pinned as the Frog."*
3. Navigate to **Week Planner** — type *"Plan my week — I need 4 hours for the Q2 report by Thursday"* into the Sage panel
4. While Sage is thinking, explain: *"Sage is calling 5 specialised sub-agents via Google ADK — CalendarAgent reads real Google Calendar, TaskAgent queries the database, PlannerAgent synthesises and writes back."*
5. Show the AI response rendering in the panel
6. Navigate to **Meeting Brief** — click "Product Review" — let the brief generate
7. Show the **Insights** screen — explain the productivity frameworks (Deep Work %, Frog Rate, MIT completion)
8. Say: *"Every other tool is reactive — you ask, it responds. Sage is proactive — it watches your entire Google Workspace and acts before you know you need it."*

---

*Built with Google ADK · Gemini 2.5 Flash · Google Workspace APIs · FastAPI · React*
