"""
POST /brief  — Pre-meeting context brief endpoint.

Given a calendar event ID (or event title + date), generates a
meeting brief Google Doc with relevant emails, Drive files, and notes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from sage.agents.orchestrator import root_agent

router = APIRouter(prefix="/brief", tags=["brief"])

_session_service = InMemorySessionService()
_APP_NAME = "sage"


class BriefRequest(BaseModel):
    event_title: str
    event_date: str          # YYYY-MM-DD
    attendees: list[str] = []
    user_id: str = "default_user"
    session_id: str = "brief_session"


class BriefResponse(BaseModel):
    reply: str
    session_id: str


@router.post("", response_model=BriefResponse)
async def generate_brief(request: BriefRequest) -> BriefResponse:
    """
    Generate a pre-meeting context brief.

    Example request body:
        {
          "event_title": "Product Review",
          "event_date": "2026-04-13",
          "attendees": ["sarah@company.com", "dev@company.com"]
        }
    """
    try:
        runner = Runner(
            agent=root_agent,
            app_name=_APP_NAME,
            session_service=_session_service,
        )

        existing = await _session_service.get_session(
            app_name=_APP_NAME,
            user_id=request.user_id,
            session_id=request.session_id,
        )
        if existing is None:
            await _session_service.create_session(
                app_name=_APP_NAME,
                user_id=request.user_id,
                session_id=request.session_id,
            )

        attendee_str = ", ".join(request.attendees) if request.attendees else "no attendees listed"
        message = (
            f"Generate a pre-meeting context brief for '{request.event_title}' "
            f"on {request.event_date}. Attendees: {attendee_str}. "
            f"Search Gmail and Drive for relevant context, then create a Google Doc brief."
        )

        content = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=message)],
        )

        reply_text = ""
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                reply_text = event.content.parts[0].text

        return BriefResponse(reply=reply_text, session_id=request.session_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
