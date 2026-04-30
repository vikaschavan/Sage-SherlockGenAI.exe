"""
POST /brief - Pre-meeting context brief endpoint.
"""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from sage.config.settings import get_settings
from sage.services.agent_runner import run_agent_message
from sage.services.demo_data import get_demo_workspace_payload
from sage.services.meeting_workspace import get_workspace, update_workspace

router = APIRouter(prefix="/brief", tags=["brief"])
logger = logging.getLogger(__name__)
settings = get_settings()


class BriefRequest(BaseModel):
    event_title: str
    event_date: str
    attendees: list[str] = Field(default_factory=list)
    user_id: str = "default_user"
    session_id: str = "brief_session"


class BriefResponse(BaseModel):
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


def _build_brief_message(payload: BriefRequest) -> str:
    attendee_str = ", ".join(payload.attendees) if payload.attendees else "no attendees listed"
    return (
        f"Generate an executive pre-meeting brief for '{payload.event_title}' on {payload.event_date}. "
        f"Attendees: {attendee_str}. "
        "Prioritize business risk, open commitments, unresolved decisions, and likely follow-up actions. "
        "Search Gmail and Drive for relevant context, then create a Google Doc brief."
    )


@router.post("", response_model=BriefResponse)
async def generate_brief(request: Request, payload: BriefRequest) -> BriefResponse:
    request_id = getattr(request.state, "request_id", None)
    workspace = await get_workspace(
        payload.event_title,
        payload.event_date,
        payload.attendees,
        seed_demo_payload=settings.demo_mode and not settings.demo_use_live_enrichment,
    )

    if workspace["brief"]:
        logger.info(
            "brief_cache_hit request_id=%s meeting_id=%s mode=%s",
            request_id,
            workspace["meeting_id"],
            workspace["source_mode"],
        )
        return BriefResponse(
            reply=workspace["brief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["doc_url"],
            cached=True,
            mode=workspace["source_mode"],
            notes_state=workspace["notes_draft"],
            request_id=request_id,
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
            brief_markdown=demo_payload["brief_markdown"],
            action_items=demo_payload.get("action_items", []),
            notes_draft=workspace.get("notes_draft") or demo_payload.get("notes_draft", ""),
            source_mode="mock",
            last_error=None,
        )
        return BriefResponse(
            reply=workspace["brief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["doc_url"],
            cached=False,
            mode="mock",
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )

    try:
        reply_text = await run_agent_message(
            message=_build_brief_message(payload),
            user_id=payload.user_id,
            session_id=payload.session_id,
            request_id=request_id or "brief",
        )
        doc_url = _extract_doc_url(reply_text)
        workspace = await update_workspace(
            payload.event_title,
            payload.event_date,
            payload.attendees,
            brief_markdown=reply_text,
            brief_doc_url=doc_url,
            source_mode="live",
            last_error=None,
        )
        return BriefResponse(
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
            "brief_failed request_id=%s meeting_id=%s event_title=%s",
            request_id,
            workspace["meeting_id"],
            payload.event_title,
        )
        workspace = await update_workspace(
            payload.event_title,
            payload.event_date,
            payload.attendees,
            brief_markdown=workspace.get("brief") or demo_payload["brief_markdown"],
            action_items=demo_payload.get("action_items", []),
            notes_draft=workspace.get("notes_draft") or demo_payload.get("notes_draft", ""),
            source_mode="partial",
            last_error=str(error),
        )
        return BriefResponse(
            reply=workspace["brief"],
            session_id=payload.session_id,
            meeting_id=workspace["meeting_id"],
            doc_url=workspace["doc_url"],
            cached=bool(workspace["has_cached_brief"]),
            mode="partial",
            notes_state=workspace["notes_draft"],
            request_id=request_id,
        )
