from fastapi import HTTPException


def raise_api_http_exception(error: Exception) -> None:
    detail = str(error)
    status_code = getattr(error, "status_code", None)

    if isinstance(error, TimeoutError):
        raise HTTPException(
            status_code=504,
            detail="Sage timed out while waiting for the AI workflow. Retry the request or use cached meeting context.",
        )

    if status_code == 429 or "RESOURCE_EXHAUSTED" in detail or "Quota exceeded" in detail:
        raise HTTPException(
            status_code=429,
            detail=(
                "Gemini quota exhausted for this project. Wait about 30 seconds and retry, "
                "or enable paid billing for higher limits."
            ),
            headers={"Retry-After": "30"},
        )

    if status_code == 403 or "PERMISSION_DENIED" in detail or "API key" in detail:
        raise HTTPException(
            status_code=403,
            detail="Gemini authentication failed. Check the deployed API key or billing/project access.",
        )

    if "Workspace OAuth is not configured" in detail or "could not locate runnable browser" in detail:
        raise HTTPException(
            status_code=503,
            detail=(
                "Workspace integrations are not configured for Cloud Run. "
                "Upload a valid token.json for the deployed service or use service-account based access."
            ),
        )

    if isinstance(error, KeyError):
        raise HTTPException(
            status_code=502,
            detail="Sage received incomplete tool data while building the response. A cached or mock fallback should be used instead.",
        )

    raise HTTPException(status_code=500, detail=detail)
