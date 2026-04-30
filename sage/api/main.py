import asyncio
import logging
import os
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sage.api.routes.brief import router as brief_router
from sage.api.routes.debrief import router as debrief_router
from sage.api.routes.meeting_workspace import router as meeting_workspace_router
from sage.api.routes.plan import router as plan_router
from sage.api.routes.tasks import router as tasks_router
from sage.agents.runtime import warm_root_agent
from sage.config.settings import get_settings
from sage.db.session import init_db
from sage.tools.knowledge_tools import seed_knowledge_from_notes
from sage.tools.task_tools import seed_mock_tasks

settings = get_settings()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

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


@app.middleware("http")
async def attach_request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex[:12]
    request.state.request_id = request_id
    started_at = perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "request_failed request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        raise

    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    response.headers["x-request-id"] = request_id
    response.headers["x-sage-mode"] = "demo" if settings.demo_mode else "live"
    logger.info(
        "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

# Use Google AI Studio API key (billing-enabled project, not Vertex AI)
if settings.google_api_key:
    os.environ["GOOGLE_API_KEY"] = settings.google_api_key
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "false"


def _log_warmup_result(task: asyncio.Task) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        logger.info("Sage agent warmup cancelled during shutdown")
    except Exception:
        logger.exception("Sage agent warmup failed")


@app.on_event("startup")
async def startup():
    await init_db()
    seed_mock_tasks()
    seed_knowledge_from_notes()
    warmup_task = asyncio.create_task(asyncio.to_thread(warm_root_agent))
    warmup_task.add_done_callback(_log_warmup_result)
    app.state.agent_warmup_task = warmup_task


@app.on_event("shutdown")
async def shutdown():
    warmup_task = getattr(app.state, "agent_warmup_task", None)
    if warmup_task and not warmup_task.done():
        warmup_task.cancel()


@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "service": "sage",
        "version": "0.1.0",
        "demo_mode": settings.demo_mode,
        "demo_use_live_enrichment": settings.demo_use_live_enrichment,
    }


app.include_router(plan_router)
app.include_router(brief_router)
app.include_router(debrief_router)
app.include_router(meeting_workspace_router)
app.include_router(tasks_router)

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
