# Sage

Proactive multi-agent productivity assistant for Google Workspace. Built with Google ADK, Gemini 2.5 Flash, and FastAPI for the Gen AI Academy APAC Hackathon.

Most productivity tools are reactive — you ask, they respond. Sage runs in the background, reasons across your Calendar, Gmail, Drive, and Tasks simultaneously, and acts before you need to ask.

## What it does

**Week Planner** — describe your week in plain language, Sage reads your calendar, checks open tasks, scans meeting notes, and returns a prioritised plan with conflict resolutions.

**Pre-Meeting Brief** — 5 minutes before a meeting, Sage pulls relevant emails, Drive files, and open tasks into a structured Google Doc so you walk in prepared.

**Post-Meeting Debrief** — paste your notes, Sage extracts action items, creates Google Tasks, blocks follow-up time on your calendar, and emails attendees a summary.

The React dashboard enforces high-performance productivity frameworks (MIT Method, Deep Work, Eat the Frog, Ivy Lee, Day Theming) as structural UI constraints, not tips.

## Architecture

```
React frontend (Vite + Tailwind)
        │
        ▼
FastAPI  ─  Cloud Run
        │
        ▼
Google ADK Runner
  └── Sage (Gemini 2.5 Flash)
        ├── CalendarAgent   →  Google Calendar API
        ├── TaskAgent       →  SQLite / AlloyDB AI
        ├── KnowledgeAgent  →  pgvector semantic search
        ├── PlannerAgent    →  synthesises plan + trade-offs
        └── NotificationAgent → Google Docs + Gmail
```

Agents run in a flat architecture — the root agent holds all sub-agents directly and uses Gemini's reasoning to fan out and sequence calls. This sidesteps ADK's single-parent constraint while keeping the pipeline flexible.

## Stack

| Layer | Tech |
|-------|------|
| AI orchestration | Google ADK + Gemini 2.5 Flash |
| Tool protocol | MCP (Model Context Protocol) |
| Database | AlloyDB AI (prod) / SQLite (local) |
| API | FastAPI + Uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Google Cloud Run + Cloud Build |
| Auth | Google OAuth2 (Calendar, Gmail, Drive, Docs, Tasks) |

## Local setup

**Requirements:** Python 3.11+, Node 20+

```bash
# Clone and install
git clone https://github.com/vikaschavan/Sage-SherlockGenAI.exe
cd Sage-SherlockGenAI.exe

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

cd sage
pip install -r requirements.txt
pip install aiosqlite
pip install -e .
```

**Environment**

Copy `.env.example` to `.env` and fill in:

```
GOOGLE_API_KEY=          # from Google AI Studio (aistudio.google.com)
USE_SQLITE=true          # local dev, no AlloyDB needed
```

**Google OAuth** (first run only)

Download OAuth credentials from GCP Console → save as `sage/auth/client_secret.json`, then:

```bash
python -c "from sage.auth.google_oauth import get_credentials; get_credentials()"
```

Browser opens, sign in, grant access. `token.json` is saved locally.

**Run**

```bash
# Backend
uvicorn sage.api.main:app --reload --port 8001

# Frontend (new terminal)
cd sage/frontend
npm install
npm run dev
```

Open http://localhost:5173

## API

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/plan` | `{ "message": "...", "user_id": "me", "session_id": "s1" }` |
| POST | `/brief` | `{ "event_title": "...", "event_date": "YYYY-MM-DD", "attendees": [] }` |
| POST | `/debrief` | `{ "event_title": "...", "event_date": "...", "attendees": [], "notes": "..." }` |
| GET | `/health` | — |

Swagger UI available at `/docs` when the server is running.

## Deploy to Cloud Run

```powershell
# Windows
.\deploy.ps1
```

The script reads your API key from `.env`, builds the container via Cloud Build (no local Docker needed), and deploys to Cloud Run. The React frontend is bundled into the same container.

## Project layout

```
sage/
├── agents/       one file per ADK agent
├── api/          FastAPI app and route handlers
├── auth/         Google OAuth2 helpers
├── config/       pydantic-settings config
├── data/         mock tasks and meeting notes for demo
├── db/           SQLAlchemy models and async session
├── frontend/     React dashboard
├── mcp_server/   local MCP tool registration
├── prompts/      system prompts for each agent
├── tools/        tool functions called by agents
└── Dockerfile    multi-stage build (Node + Python)
```

## Notes

- `token.json` and `auth/client_secret.json` are gitignored — never commit these
- SQLite is the default for local dev; set `USE_SQLITE=false` and configure AlloyDB env vars for production
- The frontend proxies API calls to port 8001 in dev via `vite.config.js`; in production it hits the same Cloud Run origin
