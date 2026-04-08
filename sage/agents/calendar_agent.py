"""
CalendarAgent — reads and writes Google Calendar via ADK.
"""

from pathlib import Path

from google.adk.agents import Agent

from sage.tools.calendar_tools import (
    create_event,
    detect_conflicts,
    find_free_slots,
    list_events,
)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "calendar_agent.txt").read_text()

calendar_agent = Agent(
    name="CalendarAgent",
    model="gemini-2.5-flash",
    description="Reads and writes Google Calendar: lists events, finds free slots, creates events, detects conflicts.",
    instruction=_PROMPT,
    tools=[list_events, find_free_slots, create_event, detect_conflicts],
)
