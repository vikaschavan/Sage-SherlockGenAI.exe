"""
NotificationAgent — creates Google Docs and sends email summaries.
"""

from google.adk.agents import Agent

from sage.tools.notification_tools import (
    create_doc,
    format_meeting_brief,
    format_weekly_plan,
    send_email_summary,
)

notification_agent = Agent(
    name="NotificationAgent",
    model="gemini-2.5-flash",
    description="Creates Google Docs (briefs, plans) and sends email summaries to attendees.",
    instruction=(
        "You create output artifacts for the user: Google Docs with meeting briefs or weekly plans, "
        "and email summaries. Always return the doc URL and confirm what was sent."
    ),
    tools=[create_doc, format_weekly_plan, format_meeting_brief, send_email_summary],
)
