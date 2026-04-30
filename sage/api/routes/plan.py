"""
POST /plan - Week planner endpoint.
"""

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from sage.api.error_handling import raise_api_http_exception
from sage.config.settings import get_settings
from sage.services.agent_runner import run_agent_message
from sage.services.demo_data import build_demo_plan_reply

router = APIRouter(prefix="/plan", tags=["plan"])
logger = logging.getLogger(__name__)
settings = get_settings()


class PlanRequest(BaseModel):
    message: str
    user_id: str = "default_user"
    session_id: str = "default_session"


class PlanResponse(BaseModel):
    reply: str
    session_id: str
    mode: str = "live"
    cached: bool = False
    request_id: str | None = None


@router.post("", response_model=PlanResponse)
async def plan_week(request: Request, payload: PlanRequest) -> PlanResponse:
    request_id = getattr(request.state, "request_id", None)
    demo_reply = build_demo_plan_reply(payload.message)

    if settings.demo_mode and not settings.demo_use_live_enrichment:
        logger.info("plan_demo_response request_id=%s session_id=%s", request_id, payload.session_id)
        return PlanResponse(
            reply=demo_reply,
            session_id=payload.session_id,
            mode="mock",
            cached=False,
            request_id=request_id,
        )

    try:
        reply_text = await run_agent_message(
            message=payload.message,
            user_id=payload.user_id,
            session_id=payload.session_id,
            request_id=request_id or "plan",
        )
        if not reply_text:
            return PlanResponse(
                reply=demo_reply,
                session_id=payload.session_id,
                mode="partial",
                cached=False,
                request_id=request_id,
            )

        return PlanResponse(
            reply=reply_text,
            session_id=payload.session_id,
            mode="live",
            cached=False,
            request_id=request_id,
        )

    except HTTPException:
        raise
    except Exception as error:
        logger.exception("plan_failed request_id=%s session_id=%s", request_id, payload.session_id)
        if settings.demo_mode:
            return PlanResponse(
                reply=demo_reply,
                session_id=payload.session_id,
                mode="partial",
                cached=False,
                request_id=request_id,
            )
        raise_api_http_exception(error)
