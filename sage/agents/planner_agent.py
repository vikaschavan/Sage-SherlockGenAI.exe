"""
PlannerAgent — synthesizes calendar + task + knowledge context into actionable plans.

This agent is called by the Orchestrator after CalendarAgent and KnowledgeAgent
have fetched their data. It reasons over the combined context and produces a
structured plan with trade-off explanations.
"""

from pathlib import Path

from google.adk.agents import Agent

from sage.tools.calendar_tools import create_event, find_free_slots
from sage.tools.notification_tools import format_weekly_plan
from sage.tools.task_tools import list_tasks

_PROMPT = (Path(__file__).parent.parent / "prompts" / "planner_agent.txt").read_text()

planner_agent = Agent(
    name="PlannerAgent",
    model="gemini-2.5-flash",
    description=(
        "Synthesizes calendar events, tasks, and knowledge context into a structured "
        "weekly or daily plan. Detects overcommitment, proposes trade-offs, and "
        "recommends focus time blocks."
    ),
    instruction=_PROMPT,
    tools=[list_tasks, find_free_slots, create_event, format_weekly_plan],
)
