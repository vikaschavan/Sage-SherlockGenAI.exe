"""
POST /plan  — Week planner endpoint.

Accepts a natural language planning request, runs the full
WeekPlannerPipeline, and returns the structured plan + any
actions taken (calendar blocks created, doc URL).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from sage.api.adk_runtime import get_adk_components, get_session_service
from sage.api.error_handling import raise_api_http_exception
from sage.agents.runtime import get_root_agent

router = APIRouter(prefix="/plan", tags=["plan"])

_APP_NAME = "sage"


class PlanRequest(BaseModel):
    message: str
    user_id: str = "default_user"
    session_id: str = "default_session"


class PlanResponse(BaseModel):
    reply: str
    session_id: str


@router.post("", response_model=PlanResponse)
async def plan_week(request: PlanRequest) -> PlanResponse:
    """
    Run the week planner pipeline with a natural language request.

    Example request body:
        {
          "message": "Plan my week. I have a product review Monday and client call Thursday.",
          "user_id": "user123"
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

        # Ensure session exists
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

        content = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=request.message)],
        )

        reply_text = ""
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id=request.session_id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                reply_text = event.content.parts[0].text

        return PlanResponse(reply=reply_text, session_id=request.session_id)

    except HTTPException:
        raise
    except Exception as e:
        raise_api_http_exception(e)
