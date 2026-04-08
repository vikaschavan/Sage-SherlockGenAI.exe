"""
POST /debrief  — Post-meeting debrief endpoint.

Accepts meeting notes/transcript text, extracts action items into tasks,
blocks follow-up time on calendar, and emails a summary to attendees.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from sage.agents.orchestrator import root_agent

router = APIRouter(prefix="/debrief", tags=["debrief"])

_session_service = InMemorySessionService()
_APP_NAME = "sage"


class DebriefRequest(BaseModel):
    event_title: str
    meeting_notes: str
    attendees: list[str] = []
    event_date: str = ""     # YYYY-MM-DD, used to schedule follow-up blocks
    user_id: str = "default_user"
    session_id: str = "debrief_session"


class DebriefResponse(BaseModel):
    reply: str
    session_id: str


@router.post("", response_model=DebriefResponse)
async def run_debrief(request: DebriefRequest) -> DebriefResponse:
    """
    Run the post-meeting debrief pipeline.

    Example request body:
        {
          "event_title": "Client Call - Apex Solutions",
          "meeting_notes": "Discussed SSO requirements...",
          "attendees": ["james@apex.com", "linda@apex.com"],
          "event_date": "2026-04-10"
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

        attendee_str = ", ".join(request.attendees) if request.attendees else "no attendees"
        message = (
            f"Run post-meeting debrief for '{request.event_title}' on {request.event_date}.\n\n"
            f"Attendees: {attendee_str}\n\n"
            f"Meeting notes:\n{request.meeting_notes}\n\n"
            f"Please: (1) extract all action items and create tasks, "
            f"(2) block follow-up time on the calendar for high-priority items, "
            f"(3) create a summary Google Doc, "
            f"(4) email the summary to attendees."
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

        return DebriefResponse(reply=reply_text, session_id=request.session_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
