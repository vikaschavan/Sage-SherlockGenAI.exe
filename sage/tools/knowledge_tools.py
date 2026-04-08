"""
Knowledge retrieval tool functions.

Searches Gmail threads and Drive files for context relevant to a
given topic/query. Falls back to keyword search when AlloyDB
vector search is not available (local dev mode).
"""

import asyncio
import re
from base64 import urlsafe_b64decode
from typing import Optional

from sqlalchemy import select

from sage.auth.google_oauth import drive_service, gmail_service
from sage.db.models import KnowledgeChunk
from sage.db.session import get_session


def _run(coro):
    try:
        loop = asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Gmail
# ---------------------------------------------------------------------------

def search_gmail(query: str, max_results: int = 5) -> list[dict]:
    """
    Search Gmail for threads matching a query.

    Args:
        query: Gmail search query (e.g. "product review Q2" or "from:john@example.com").
        max_results: Maximum number of thread snippets to return.

    Returns:
        List of dicts with thread_id, subject, snippet, date, from_email.
    """
    service = gmail_service()
    results = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = []
    for msg_ref in results.get("messages", []):
        msg = service.users().messages().get(
            userId="me", id=msg_ref["id"], format="metadata",
            metadataHeaders=["Subject", "From", "Date"]
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        messages.append({
            "message_id": msg["id"],
            "thread_id": msg.get("threadId"),
            "subject": headers.get("Subject", "(No subject)"),
            "from_email": headers.get("From", ""),
            "date": headers.get("Date", ""),
            "snippet": msg.get("snippet", ""),
        })

    return messages


def get_gmail_thread_body(thread_id: str) -> str:
    """
    Get the full text content of a Gmail thread.

    Args:
        thread_id: Gmail thread ID.

    Returns:
        Combined plain-text body of all messages in the thread.
    """
    service = gmail_service()
    thread = service.users().threads().get(
        userId="me", id=thread_id, format="full"
    ).execute()

    texts = []
    for message in thread.get("messages", []):
        body = _extract_body(message.get("payload", {}))
        if body:
            texts.append(body)

    return "\n\n---\n\n".join(texts)


def _extract_body(payload: dict) -> str:
    """Recursively extract plain text from a Gmail message payload."""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    for part in payload.get("parts", []):
        result = _extract_body(part)
        if result:
            return result

    return ""


# ---------------------------------------------------------------------------
# Google Drive
# ---------------------------------------------------------------------------

def search_drive(query: str, max_results: int = 5) -> list[dict]:
    """
    Search Google Drive for files matching a query.

    Args:
        query: Full-text search query.
        max_results: Maximum number of file results.

    Returns:
        List of dicts with file_id, name, mime_type, web_view_link, modified_time.
    """
    service = drive_service()
    results = service.files().list(
        q=f"fullText contains '{query}' and trashed=false",
        pageSize=max_results,
        fields="files(id, name, mimeType, webViewLink, modifiedTime)",
        orderBy="modifiedTime desc",
    ).execute()

    return [
        {
            "file_id": f["id"],
            "name": f["name"],
            "mime_type": f.get("mimeType", ""),
            "web_view_link": f.get("webViewLink", ""),
            "modified_time": f.get("modifiedTime", ""),
        }
        for f in results.get("files", [])
    ]


# ---------------------------------------------------------------------------
# Local knowledge store (mock / AlloyDB fallback)
# ---------------------------------------------------------------------------

def search_knowledge_store(query: str, source_type: Optional[str] = None, top_k: int = 5) -> list[dict]:
    """
    Search the local knowledge store using keyword matching.
    In production this would use AlloyDB AI pgvector similarity search.

    Args:
        query: Natural language search query.
        source_type: Filter by source ("gmail" | "drive" | "notes"). None = all.
        top_k: Number of results to return.

    Returns:
        List of knowledge chunk dicts ordered by relevance score.
    """
    async def _search():
        async with get_session() as session:
            stmt = select(KnowledgeChunk)
            if source_type:
                stmt = stmt.where(KnowledgeChunk.source_type == source_type)
            result = await session.execute(stmt)
            chunks = result.scalars().all()

        keywords = re.findall(r"\w+", query.lower())
        scored = []
        for chunk in chunks:
            text = f"{chunk.title or ''} {chunk.content} {chunk.keywords or ''}".lower()
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                d = chunk.to_dict()
                d["relevance_score"] = score
                scored.append(d)

        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored[:top_k]

    return _run(_search())


def seed_knowledge_from_notes() -> int:
    """
    Seed the knowledge store from mock notes in data/mock_notes/.

    Returns:
        Number of chunks inserted.
    """
    from pathlib import Path

    notes_dir = Path(__file__).parent.parent / "data" / "mock_notes"
    if not notes_dir.exists():
        return 0

    async def _seed():
        inserted = 0
        async with get_session() as session:
            for note_file in notes_dir.glob("*.md"):
                content = note_file.read_text(encoding="utf-8")
                existing = await session.execute(
                    select(KnowledgeChunk).where(KnowledgeChunk.source_id == note_file.name)
                )
                if existing.scalar_one_or_none() is None:
                    chunk = KnowledgeChunk(
                        source_type="notes",
                        source_id=note_file.name,
                        title=note_file.stem.replace("_", " ").title(),
                        content=content,
                        keywords=" ".join(re.findall(r"\w+", content.lower())[:50]),
                    )
                    session.add(chunk)
                    inserted += 1
        return inserted

    return _run(_seed())
