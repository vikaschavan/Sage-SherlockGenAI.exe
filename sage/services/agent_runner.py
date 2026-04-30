from __future__ import annotations

import asyncio
import logging

from sage.api.adk_runtime import get_adk_components, get_session_service
from sage.agents.runtime import get_root_agent
from sage.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_APP_NAME = "sage"


async def run_agent_message(
    *,
    message: str,
    user_id: str,
    session_id: str,
    request_id: str,
) -> str:
    Runner, _, genai_types = get_adk_components()
    session_service = get_session_service()
    runner = Runner(
        agent=get_root_agent(),
        app_name=_APP_NAME,
        session_service=session_service,
    )

    existing = await session_service.get_session(
        app_name=_APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )
    if existing is None:
        await session_service.create_session(
            app_name=_APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )

    content = genai_types.Content(
        role="user",
        parts=[genai_types.Part(text=message)],
    )

    reply_text = ""
    async with asyncio.timeout(settings.ai_request_timeout_seconds):
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                reply_text = event.content.parts[0].text or ""

    logger.info(
        "agent_request_completed request_id=%s session_id=%s has_reply=%s",
        request_id,
        session_id,
        bool(reply_text),
    )
    return reply_text
