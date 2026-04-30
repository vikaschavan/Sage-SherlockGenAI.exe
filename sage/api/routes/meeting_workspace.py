from __future__ import annotations

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from sage.config.settings import get_settings
from sage.services.meeting_workspace import get_workspace, update_workspace

router = APIRouter(prefix="/meeting-workspace", tags=["meeting-workspace"])
settings = get_settings()


class MeetingWorkspaceResponse(BaseModel):
    meeting_id: str
    event_title: str
    event_date: str
    attendees: list[str]
    notes_draft: str = ""
    brief: str | None = None
    doc_url: str | None = None
    debrief: str | None = None
    debrief_doc_url: str | None = None
    action_items: list[dict] = Field(default_factory=list)
    source_mode: str = "mock"
    has_cached_brief: bool = False
    has_cached_debrief: bool = False
    updated_at: str | None = None
    request_id: str | None = None


class MeetingWorkspaceDraftRequest(BaseModel):
    event_title: str
    event_date: str
    attendees: list[str] = Field(default_factory=list)
    notes_draft: str = ""


@router.get("", response_model=MeetingWorkspaceResponse)
async def fetch_meeting_workspace(
    request: Request,
    event_title: str,
    event_date: str,
    attendees: list[str] = Query(default=[]),
) -> MeetingWorkspaceResponse:
    workspace = await get_workspace(
        event_title,
        event_date,
        attendees,
        seed_demo_payload=settings.demo_mode and not settings.demo_use_live_enrichment,
    )
    workspace["request_id"] = getattr(request.state, "request_id", None)
    return MeetingWorkspaceResponse(**workspace)


@router.post("/draft", response_model=MeetingWorkspaceResponse)
async def save_meeting_workspace_draft(
    request: Request,
    payload: MeetingWorkspaceDraftRequest,
) -> MeetingWorkspaceResponse:
    workspace = await update_workspace(
        payload.event_title,
        payload.event_date,
        payload.attendees,
        notes_draft=payload.notes_draft,
    )
    workspace["request_id"] = getattr(request.state, "request_id", None)
    return MeetingWorkspaceResponse(**workspace)
