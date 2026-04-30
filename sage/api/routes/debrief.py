"""
POST /debrief - Post-meeting debrief endpoint.
"""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import AliasChoices, BaseModel, Field

from sage.config.settings import get_settings
from sage.services.agent_runner import run_agent_message
from sage.services.demo_data import get_demo_workspace_payload
from sage.services.meeting_workspace import get_workspace, update_workspace

router = APIRouter(prefix="/debrief", tags=["debrief"])
logger = logging.getLogger(__name__)
settings = get_settings()


class DebriefRequest(BaseModel):
    event_title: str
    meeting_notes: str = Field(validation_alias=AliasChoices("meeting_notes", "notes"))
    attendees: list[str] = Field(default_factory=list)
    event_date: str = ""
    user_id: str = "default_user"
    session_id: str = "debrief_session"


class DebriefResponse(BaseModel):
    reply: str
    session_id: str
    meeting_id: str
    doc_url: str | None = None
    cached: bool = False
    mode: str = "live"
    notes_state: str = ""
    request_id: str | None = None


def _extract_doc_url(text: str) -> str | None:
    match = re.search(r"https://docs\.google\.com/document/d/[^\s)]+", text)
    return match.group(0) if match else None


def _build_debrief_message(payload: DebriefRequest) -> str:
    attendee_str = ", ".join(payload.attendees) if payload.attendees else "no attendees"
    return (
        f"Run an executive post-meeting debrief for '{payload.event_title}' on {payload.event_date}.\n\n"
        f"Attendees: {attendee_str}\n\n"
        f"Meeting notes:\n{payload.meeting_notes}\n\n"
        "Return a structured summary with: decisions made, action items, owners, due dates, executive risks, "
        "and a follow-up email draft. Then create a summary Google Doc and email the summary to attendees."
    )


@router.post("", response_model=DebriefResponse)
async def run_debrief(request: Request, payload: DebriefRequest) -> DebriefResponse:
    request_id = getattr(request.state, "request_id", None)
    workspace = await get_workspace(
        payload.event_title,
        payload.event_date,
        payload.attendees,
        seed_demo_payload=settings.demo_mode and not settings.demo_use_live_enrichment,
    )

    workspace = await update_workspace(
        payload.event_title,
        payload.event_date,
        payload.attendees,
        notes_draft=payload.meeting_notes,
    )

    demo_payload = get_demo_workspace_payload(
        payload.event_title,
        payload.event_date,
        payload.attendees,
    )

    if settings.demo_mode and not settings.demo_use_live_enrichment:
        workspace = await update_workspace(
            payload.event_title,
            payload.event_date,
            payload.attendees,
            debrief_markdown=demo_payload["debrief_markdown"],
            action_items=demo_payload.get("action_items", []),
            source_mode="mock",
            last_error=None,
        )
        return DebriefResponse(
            reply=workspace["debrief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["debrief_doc_url"],
            cached=False,
            mode="mock",
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )

    if workspace["debrief"] and workspace["notes_draft"] == payload.meeting_notes:
        return DebriefResponse(
            reply=workspace["debrief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["debrief_doc_url"],
            cached=True,
            mode=workspace["source_mode"],
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )

    try:
        reply_text = await run_agent_message(
            message=_build_debrief_message(payload),
            user_id=payload.user_id,
            session_id=payload.session_id,
            request_id=request_id or "debrief",
        )
        doc_url = _extract_doc_url(reply_text)
        workspace = await update_workspace(
            payload.event_title,
            payload.event_date,
            payload.attendees,
            debrief_markdown=reply_text,
            debrief_doc_url=doc_url,
            source_mode="live",
            last_error=None,
        )
        return DebriefResponse(
            reply=reply_text,
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=doc_url,
            cached=False,
            mode="live",
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )

    except HTTPException:
        raise
    except Exception as error:
        logger.exception(
            "debrief_failed request_id=%s meeting_id=%s event_title=%s",
            request_id,
            workspace["meeting_id"],
            payload.event_title,
        )
        workspace = await update_workspace(
            payload.event_title,
            payload.event_date,
            payload.attendees,
            debrief_markdown=workspace.get("debrief") or demo_payload["debrief_markdown"],
            action_items=demo_payload.get("action_items", []),
            source_mode="partial",
            last_error=str(error),
        )
        return DebriefResponse(
            reply=workspace["debrief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["debrief_doc_url"],
            cached=bool(workspace["has_cached_debrief"]),
            mode="partial",
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )
