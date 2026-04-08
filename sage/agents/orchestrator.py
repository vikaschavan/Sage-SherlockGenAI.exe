# Root agent — flat architecture so Gemini handles orchestration order.
# ADK enforces single-parent on composite agents; flat sidesteps that constraint.

from pathlib import Path

from google.adk.agents import Agent

from sage.agents.calendar_agent import calendar_agent
from sage.agents.knowledge_agent import knowledge_agent
from sage.agents.notification_agent import notification_agent
from sage.agents.planner_agent import planner_agent
from sage.agents.task_agent import task_agent

_PROMPT = (Path(__file__).parent.parent / "prompts" / "orchestrator.txt").read_text()

root_agent = Agent(
    name="Sage",
    model="gemini-2.5-flash",
    description="Sage — proactive multi-agent productivity assistant for Google Workspace.",
    instruction=_PROMPT,
    sub_agents=[
        calendar_agent,
        task_agent,
        knowledge_agent,
        planner_agent,
        notification_agent,
    ],
)
