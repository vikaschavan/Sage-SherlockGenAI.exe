"""
KnowledgeAgent — retrieves context from Gmail, Drive, and the local knowledge store.
"""

from pathlib import Path

from google.adk.agents import Agent

from sage.tools.knowledge_tools import (
    get_gmail_thread_body,
    search_drive,
    search_gmail,
    search_knowledge_store,
)

_PROMPT = (Path(__file__).parent.parent / "prompts" / "knowledge_agent.txt").read_text()

knowledge_agent = Agent(
    name="KnowledgeAgent",
    model="gemini-2.5-flash",
    description="Searches Gmail threads, Google Drive files, and local meeting notes for relevant context.",
    instruction=_PROMPT,
    tools=[search_gmail, get_gmail_thread_body, search_drive, search_knowledge_store],
)
