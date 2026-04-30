from __future__ import annotations

import hashlib
import json
from typing import Any

from sqlalchemy import select

from sage.db.models import MeetingWorkspace
from sage.db.session import get_session
from sage.services.demo_data import get_demo_workspace_payload


def build_meeting_id(event_title: str, event_date: str, attendees: list[str]) -> str:
    attendees_key = "|".join(sorted(attendees))
    raw_key = f"{event_title.strip().lower()}::{event_date.strip()}::{attendees_key}"
    return hashlib.sha1(raw_key.encode("utf-8")).hexdigest()[:16]


def _loads_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True)


def serialize_workspace(workspace: MeetingWorkspace) -> dict[str, Any]:
    return {
        "meeting_id": workspace.meeting_id,
        "event_title": workspace.event_title,
        "event_date": workspace.event_date,
        "attendees": _loads_json(workspace.attendees_json, []),
        "notes_draft": workspace.notes_draft or "",
        "brief": workspace.brief_markdown,
        "doc_url": workspace.brief_doc_url,
        "debrief": workspace.debrief_markdown,
        "debrief_doc_url": workspace.debrief_doc_url,
        "action_items": _loads_json(workspace.action_items_json, []),
        "source_mode": workspace.source_mode,
        "last_error": workspace.last_error,
        "has_cached_brief": bool(workspace.brief_markdown),
        "has_cached_debrief": bool(workspace.debrief_markdown),
        "updated_at": workspace.updated_at.isoformat() if workspace.updated_at else None,
    }


async def get_workspace(
    event_title: str,
    event_date: str,
    attendees: list[str],
    *,
    seed_demo_payload: bool = False,
) -> dict[str, Any]:
    meeting_id = build_meeting_id(event_title, event_date, attendees)
    async with get_session() as session:
        result = await session.execute(
            select(MeetingWorkspace).where(MeetingWorkspace.meeting_id == meeting_id)
        )
        workspace = result.scalar_one_or_none()

        if workspace is None:
            workspace = MeetingWorkspace(
                meeting_id=meeting_id,
                event_title=event_title,
                event_date=event_date,
                attendees_json=_dump_json(attendees),
            )
            if seed_demo_payload:
                payload = get_demo_workspace_payload(event_title, event_date, attendees)
                workspace.notes_draft = payload.get("notes_draft", "")
                workspace.brief_markdown = payload.get("brief_markdown")
                workspace.debrief_markdown = payload.get("debrief_markdown")
                workspace.action_items_json = _dump_json(payload.get("action_items", []))
                workspace.source_mode = "mock"
            session.add(workspace)
            await session.flush()
            await session.refresh(workspace)

        return serialize_workspace(workspace)


async def update_workspace(
    event_title: str,
    event_date: str,
    attendees: list[str],
    **fields: Any,
) -> dict[str, Any]:
    meeting_id = build_meeting_id(event_title, event_date, attendees)
    async with get_session() as session:
        result = await session.execute(
            select(MeetingWorkspace).where(MeetingWorkspace.meeting_id == meeting_id)
        )
        workspace = result.scalar_one_or_none()
        if workspace is None:
            workspace = MeetingWorkspace(
                meeting_id=meeting_id,
                event_title=event_title,
                event_date=event_date,
                attendees_json=_dump_json(attendees),
            )
            session.add(workspace)

        workspace.event_title = event_title
        workspace.event_date = event_date
        workspace.attendees_json = _dump_json(attendees)

        if "notes_draft" in fields:
            workspace.notes_draft = fields["notes_draft"]
        if "brief_markdown" in fields:
            workspace.brief_markdown = fields["brief_markdown"]
        if "brief_doc_url" in fields:
            workspace.brief_doc_url = fields["brief_doc_url"]
        if "debrief_markdown" in fields:
            workspace.debrief_markdown = fields["debrief_markdown"]
        if "debrief_doc_url" in fields:
            workspace.debrief_doc_url = fields["debrief_doc_url"]
        if "action_items" in fields:
            workspace.action_items_json = _dump_json(fields["action_items"])
        if "source_mode" in fields:
            workspace.source_mode = fields["source_mode"]
        if "last_error" in fields:
            workspace.last_error = fields["last_error"]

        await session.flush()
        await session.refresh(workspace)
        return serialize_workspace(workspace)
