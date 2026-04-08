"""
Local MCP server exposing all Sage tools.

Run with:
    python -m sage.mcp_server.server

This registers all tool functions with the MCP protocol so they can be
discovered and called by ADK agents via the MCP tool interface.
"""

import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

from sage.tools.calendar_tools import (
    create_event,
    detect_conflicts,
    find_free_slots,
    list_events,
)
from sage.tools.knowledge_tools import (
    get_gmail_thread_body,
    search_drive,
    search_gmail,
    search_knowledge_store,
)
from sage.tools.notification_tools import (
    create_doc,
    send_email_summary,
)
from sage.tools.task_tools import (
    create_task,
    get_overdue_tasks,
    list_tasks,
    update_task_status,
)

app = Server("sage-mcp")

# Registry: tool_name -> (function, description, input_schema)
_TOOLS: dict[str, tuple] = {
    # Calendar
    "list_events": (
        list_events,
        "List upcoming Google Calendar events.",
        {
            "type": "object",
            "properties": {
                "days_ahead": {"type": "integer", "default": 7},
                "max_results": {"type": "integer", "default": 20},
            },
        },
    ),
    "find_free_slots": (
        find_free_slots,
        "Find available time slots on a given date.",
        {
            "type": "object",
            "properties": {
                "date_str": {"type": "string"},
                "duration_minutes": {"type": "integer", "default": 60},
            },
            "required": ["date_str"],
        },
    ),
    "create_event": (
        create_event,
        "Create a Google Calendar event.",
        {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "start_datetime": {"type": "string"},
                "end_datetime": {"type": "string"},
                "description": {"type": "string"},
                "attendees": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["title", "start_datetime", "end_datetime"],
        },
    ),
    "detect_conflicts": (
        detect_conflicts,
        "Detect overlapping calendar events.",
        {"type": "object", "properties": {"days_ahead": {"type": "integer", "default": 7}}},
    ),
    # Tasks
    "list_tasks": (
        list_tasks,
        "List tasks with optional filters.",
        {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "priority": {"type": "string"},
                "project": {"type": "string"},
                "due_before": {"type": "string"},
            },
        },
    ),
    "create_task": (
        create_task,
        "Create a new task.",
        {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "priority": {"type": "string"},
                "due_date": {"type": "string"},
                "assignee": {"type": "string"},
                "project": {"type": "string"},
            },
            "required": ["title"],
        },
    ),
    "update_task_status": (
        update_task_status,
        "Update a task's status.",
        {
            "type": "object",
            "properties": {
                "task_id": {"type": "integer"},
                "status": {"type": "string"},
            },
            "required": ["task_id", "status"],
        },
    ),
    "get_overdue_tasks": (
        get_overdue_tasks,
        "Get all overdue tasks.",
        {"type": "object", "properties": {}},
    ),
    # Knowledge
    "search_gmail": (
        search_gmail,
        "Search Gmail threads by query.",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "max_results": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    ),
    "get_gmail_thread_body": (
        get_gmail_thread_body,
        "Get the full text of a Gmail thread.",
        {
            "type": "object",
            "properties": {"thread_id": {"type": "string"}},
            "required": ["thread_id"],
        },
    ),
    "search_drive": (
        search_drive,
        "Search Google Drive files.",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "max_results": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    ),
    "search_knowledge_store": (
        search_knowledge_store,
        "Search local knowledge store (notes, embeddings).",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "source_type": {"type": "string"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    ),
    # Notifications
    "create_doc": (
        create_doc,
        "Create a Google Doc with given content.",
        {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "body_markdown": {"type": "string"},
            },
            "required": ["title", "body_markdown"],
        },
    ),
    "send_email_summary": (
        send_email_summary,
        "Send an email summary to recipients.",
        {
            "type": "object",
            "properties": {
                "to_emails": {"type": "array", "items": {"type": "string"}},
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["to_emails", "subject", "body"],
        },
    ),
}


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(name=name, description=meta[1], inputSchema=meta[2])
        for name, meta in _TOOLS.items()
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name not in _TOOLS:
        raise ValueError(f"Unknown tool: {name}")
    fn = _TOOLS[name][0]
    result = fn(**arguments)
    return [types.TextContent(type="text", text=str(result))]


if __name__ == "__main__":
    import asyncio
    asyncio.run(mcp.server.stdio.run(app))
