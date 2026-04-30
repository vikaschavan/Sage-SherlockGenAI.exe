from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from sage.db.models import Task, TaskPriority, TaskStatus
from sage.db.session import get_session

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    status: str
    priority: str
    due_date: str | None = None
    assignee: str | None = None
    project: str | None = None
    request_id: str | None = None


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=512)
    description: str = ""
    priority: str = TaskPriority.MEDIUM
    due_date: str | None = None
    assignee: str | None = None
    project: str | None = None
    calendar_event_id: str | None = None


class TaskStatusUpdateRequest(BaseModel):
    status: str


def _validate_priority(priority: str) -> str:
    allowed = {TaskPriority.HIGH.value, TaskPriority.MEDIUM.value, TaskPriority.LOW.value}
    if priority not in allowed:
      raise HTTPException(status_code=400, detail=f"Unsupported priority: {priority}")
    return priority


def _validate_status(status: str) -> str:
    allowed = {
        TaskStatus.TODO.value,
        TaskStatus.IN_PROGRESS.value,
        TaskStatus.DONE.value,
        TaskStatus.DEFERRED.value,
    }
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported status: {status}")
    return status


def _with_request_id(task: Task, request_id: str | None) -> TaskResponse:
    return TaskResponse(**task.to_dict(), request_id=request_id)


@router.get("", response_model=list[TaskResponse])
async def list_task_items(
    request: Request,
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    project: str | None = Query(default=None),
) -> list[TaskResponse]:
    request_id = getattr(request.state, "request_id", None)
    async with get_session() as session:
        stmt = select(Task).order_by(Task.created_at.desc(), Task.id.desc())
        if status:
            stmt = stmt.where(Task.status == _validate_status(status))
        if priority:
            stmt = stmt.where(Task.priority == _validate_priority(priority))
        if project:
            stmt = stmt.where(Task.project == project)
        result = await session.execute(stmt)
        return [_with_request_id(task, request_id) for task in result.scalars().all()]


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task_item(request: Request, payload: TaskCreateRequest) -> TaskResponse:
    request_id = getattr(request.state, "request_id", None)
    async with get_session() as session:
        task = Task(
            title=payload.title.strip(),
            description=payload.description.strip(),
            priority=_validate_priority(payload.priority),
            status=TaskStatus.TODO.value,
            due_date=datetime.fromisoformat(payload.due_date) if payload.due_date else None,
            assignee=payload.assignee,
            project=payload.project,
            calendar_event_id=payload.calendar_event_id,
        )
        session.add(task)
        await session.flush()
        return _with_request_id(task, request_id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task_item(
    task_id: int,
    request: Request,
    payload: TaskStatusUpdateRequest,
) -> TaskResponse:
    request_id = getattr(request.state, "request_id", None)
    async with get_session() as session:
        task = await session.get(Task, task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        task.status = _validate_status(payload.status)
        await session.flush()
        return _with_request_id(task, request_id)
