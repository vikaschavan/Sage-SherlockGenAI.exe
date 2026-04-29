"""
POST /debrief  — Post-meeting debrief endpoint.

Accepts meeting notes/transcript text, extracts action items into tasks,
blocks follow-up time on calendar, and emails a summary to attendees.
"""

from fastapi import APIRouter, HTTPException
from pydantic import AliasChoices, BaseModel, Field

from sage.api.adk_runtime import get_adk_components, get_session_service
from sage.api.error_handling import raise_api_http_exception
from sage.agents.runtime import get_root_agent

router = APIRouter(prefix="/debrief", tags=["debrief"])

_APP_NAME = "sage"


class DebriefRequest(BaseModel):
    event_title: str
    meeting_notes: str = Field(
        validation_alias=AliasChoices("meeting_notes", "notes")
    )
    attendees: list[str] = Field(default_factory=list)
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
        Runner, _, genai_types = get_adk_components()
        session_service = get_session_service()
        runner = Runner(
            agent=get_root_agent(),
            app_name=_APP_NAME,
            session_service=session_service,
        )

        existing = await session_service.get_session(
            app_name=_APP_NAME,
            user_id=request.user_id,
            session_id=request.session_id,
        )
        if existing is None:
            await session_service.create_session(
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

    except HTTPException:
        raise
    except Exception as e:
        raise_api_http_exception(e)
