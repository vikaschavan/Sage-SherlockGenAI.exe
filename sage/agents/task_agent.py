"""
TaskAgent — manages the task backlog via ADK.
"""

from pathlib import Path

from google.adk.agents import Agent

from sage.tools.task_tools import (
    create_task,
    get_overdue_tasks,
    list_tasks,
    update_task_status,
)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "task_agent.txt").read_text()

task_agent = Agent(
    name="TaskAgent",
    model="gemini-2.5-flash",
    description="Manages tasks: lists, creates, updates status, and surfaces overdue items.",
    instruction=_PROMPT,
    tools=[list_tasks, create_task, update_task_status, get_overdue_tasks],
)
