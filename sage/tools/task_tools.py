"""
Task management tool functions.

Writes to local DB (Tasks table) and optionally syncs to Google Tasks API.
ADK agents call these functions directly.
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import select, update

from sage.db.models import Task, TaskPriority, TaskStatus
from sage.db.session import get_session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(coro):
    """Run an async coroutine from sync context (used by ADK tool calls)."""
    try:
        loop = asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result()
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Tool functions
# ---------------------------------------------------------------------------

def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    project: Optional[str] = None,
    due_before: Optional[str] = None,
) -> list[dict]:
    """
    List tasks from the database with optional filters.

    Args:
        status: Filter by status (todo | in_progress | done | deferred).
        priority: Filter by priority (high | medium | low).
        project: Filter by project name.
        due_before: ISO date string — return tasks due before this date.

    Returns:
        List of task dicts.
    """
    async def _query():
        async with get_session() as session:
            stmt = select(Task)
            if status:
                stmt = stmt.where(Task.status == status)
            if priority:
                stmt = stmt.where(Task.priority == priority)
            if project:
                stmt = stmt.where(Task.project == project)
            if due_before:
                dt = datetime.fromisoformat(due_before)
                stmt = stmt.where(Task.due_date <= dt)
            result = await session.execute(stmt)
            return [t.to_dict() for t in result.scalars().all()]

    return _run(_query())


def create_task(
    title: str,
    description: str = "",
    priority: str = "medium",
    due_date: Optional[str] = None,
    assignee: Optional[str] = None,
    project: Optional[str] = None,
    calendar_event_id: Optional[str] = None,
) -> dict:
    """
    Create a new task in the database.

    Args:
        title: Task title.
        description: Detailed description.
        priority: high | medium | low.
        due_date: ISO date/datetime string.
        assignee: Name or email of person responsible.
        project: Project this task belongs to.
        calendar_event_id: Link to a Google Calendar event if applicable.

    Returns:
        Created task dict.
    """
    async def _create():
        async with get_session() as session:
            task = Task(
                title=title,
                description=description,
                priority=priority,
                status=TaskStatus.TODO,
                due_date=datetime.fromisoformat(due_date) if due_date else None,
                assignee=assignee,
                project=project,
                calendar_event_id=calendar_event_id,
            )
            session.add(task)
            await session.flush()
            return task.to_dict()

    return _run(_create())


def update_task_status(task_id: int, status: str) -> dict:
    """
    Update a task's status.

    Args:
        task_id: ID of the task to update.
        status: New status (todo | in_progress | done | deferred).

    Returns:
        Updated task dict.
    """
    async def _update():
        async with get_session() as session:
            stmt = (
                update(Task)
                .where(Task.id == task_id)
                .values(status=status)
                .returning(Task)
            )
            result = await session.execute(stmt)
            task = result.scalar_one()
            return task.to_dict()

    return _run(_update())


def get_overdue_tasks() -> list[dict]:
    """
    Return all tasks that are past their due date and not done.

    Returns:
        List of overdue task dicts.
    """
    async def _query():
        async with get_session() as session:
            now = datetime.utcnow()
            stmt = (
                select(Task)
                .where(Task.due_date < now)
                .where(Task.status != TaskStatus.DONE)
            )
            result = await session.execute(stmt)
            return [t.to_dict() for t in result.scalars().all()]

    return _run(_query())


def seed_mock_tasks() -> int:
    """
    Seed the database with mock tasks from data/mock_tasks.json.
    Safe to call multiple times (skips existing titles).

    Returns:
        Number of tasks inserted.
    """
    mock_path = Path(__file__).parent.parent / "data" / "mock_tasks.json"
    if not mock_path.exists():
        return 0

    with open(mock_path) as f:
        mock_data = json.load(f)

    async def _seed():
        inserted = 0
        async with get_session() as session:
            for item in mock_data:
                existing = await session.execute(
                    select(Task).where(Task.title == item["title"])
                )
                if existing.scalar_one_or_none() is None:
                    task = Task(
                        title=item["title"],
                        description=item.get("description", ""),
                        priority=item.get("priority", "medium"),
                        status=item.get("status", "todo"),
                        due_date=(
                            datetime.fromisoformat(item["due_date"])
                            if item.get("due_date")
                            else None
                        ),
                        assignee=item.get("assignee"),
                        project=item.get("project"),
                    )
                    session.add(task)
                    inserted += 1
        return inserted

    return _run(_seed())
