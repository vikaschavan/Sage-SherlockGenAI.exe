import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sage.api.routes.brief import router as brief_router
from sage.api.routes.debrief import router as debrief_router
from sage.api.routes.plan import router as plan_router
from sage.config.settings import get_settings
from sage.db.session import init_db
from sage.tools.knowledge_tools import seed_knowledge_from_notes
from sage.tools.task_tools import seed_mock_tasks

settings = get_settings()

app = FastAPI(
    title="Sage",
    description="Proactive multi-agent productivity assistant for Google Workspace.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use Google AI Studio API key (billing-enabled project, not Vertex AI)
if settings.google_api_key:
    os.environ["GOOGLE_API_KEY"] = settings.google_api_key
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"


@app.on_event("startup")
async def startup():
    await init_db()
    seed_mock_tasks()
    seed_knowledge_from_notes()


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "sage", "version": "0.1.0"}


app.include_router(plan_router)
app.include_router(brief_router)
app.include_router(debrief_router)

# Serve the React build in production (dist/ is baked in by the Dockerfile).
# Skipped gracefully in local dev where dist/ doesn't exist.
_dist = Path(__file__).parent.parent / "frontend" / "dist"

if _dist.exists():
    _assets = _dist / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        return FileResponse(str(_dist / "index.html"))
