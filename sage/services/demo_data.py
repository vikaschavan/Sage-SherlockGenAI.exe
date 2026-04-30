from __future__ import annotations

from copy import deepcopy
from typing import Any


DEMO_MEETING_TEMPLATES: dict[str, dict[str, Any]] = {
    "product review": {
        "notes_draft": """Product Review Meeting - April 30, 2026

Attendees: Alice, Bob, Carol

Decisions:
- Feature X launch moves to May 8 until auth regression issues close.
- Product Review Monday will focus on customer impact and release readiness.

Action items:
- Alice to send revised launch timeline by Friday.
- Bob to finish auth PR review by 4pm today.
- Carol to confirm customer comms draft before EOD.
""",
        "brief_markdown": """# Product Review Executive Brief

## Why this meeting matters
- Release readiness is gating the Q2 board narrative.
- Two open engineering risks still affect launch confidence.

## Prior commitments
- Auth refactor must be merged before the Wednesday deploy window.
- Customer-facing launch timeline needs a revised owner-approved version today.

## Decisions required
- Confirm whether Feature X remains in the May launch.
- Decide if the dashboard redesign stays out of Q3.
- Approve what can be delegated to the eng leads before Monday.

## Risks and blockers
- Auth regression coverage is incomplete.
- Launch communications are not final.
- Weekly status meetings are diluting prep time for strategic work.

## Recommended talking points
- Ask Bob for a binary ship / no-ship view on auth.
- Ask Alice which milestone can slip with lowest customer impact.
- Push non-decision updates to async follow-up.
""",
        "debrief_markdown": """# Product Review Debrief

## Decisions made
- Feature X launch moved to May 8.
- Dashboard redesign remains out of Q3 scope.

## Action items
- Alice: send revised launch timeline by Friday.
- Bob: close auth review and confirm regression status by 4pm.
- Carol: finalize customer comms draft before EOD.

## Follow-up draft
Team,

Today we aligned on a May 8 launch for Feature X, pending auth stability confirmation. Please treat the launch timeline, auth review, and customer comms draft as the three critical path items for tomorrow morning.
""",
        "action_items": [
            {"owner": "Alice", "task": "Send revised launch timeline", "due_date": "2026-05-01"},
            {"owner": "Bob", "task": "Close auth review and confirm regression status", "due_date": "2026-04-30"},
            {"owner": "Carol", "task": "Finalize customer comms draft", "due_date": "2026-04-30"},
        ],
    },
    "apex client call": {
        "notes_draft": """Apex Client Call - April 30, 2026

Attendees: Priya, James

Discussion:
- Apex wants the proposal revised around enterprise rollout sequencing.
- James needs an executive note on procurement timing before Monday.
- Priya asked for a clearer owner on the technical deep-dive and success metrics.

Decisions:
- Send a revised proposal recap today.
- Hold pricing line, but offer phased onboarding support.

Action items:
- Send proposal recap and next steps to Apex by 5pm.
- Confirm procurement blockers and owner list for next week.
- Schedule the infra deep-dive for Tuesday morning.
""",
        "brief_markdown": """# Apex Client Call Executive Brief

## Why this meeting matters
- Apex is one of the few expansion motions large enough to affect the Q2 number.
- Procurement timing is the main risk; the commercial conversation is already warm.

## Prior commitments
- Revised proposal with 5k-seat pricing was promised after the last call.
- EU residency assurance and rollout sequencing need a crisp written answer.

## Unresolved decisions
- Whether procurement can still close inside Q2.
- Whether we need exec sponsorship to unblock their technical review.

## Risks and blockers
- Procurement may slip the deal to Q3.
- Technical deep-dive ownership is not yet explicit.
- Follow-up cadence has been reactive instead of executive-led.

## Recommended talk track
- Confirm the single blocker to signature.
- Push for an agreed decision date.
- Delegate technical follow-up while keeping commercial ownership at exec level.
""",
        "debrief_markdown": """# Apex Client Call Debrief

## Decisions made
- Proposal recap goes out today.
- Procurement blockers will be reviewed in a dedicated follow-up.
- Technical deep-dive moves to Tuesday morning.

## Action items
- Vikas: send proposal recap and next steps by 5pm.
- Priya: confirm rollout sequence and success metrics.
- James: return procurement blocker list before Monday noon.

## Follow-up draft
James and Priya,

Thanks for today. We aligned on a revised proposal recap today, a focused procurement blocker review, and a Tuesday technical deep-dive so we can keep the Q2 decision path intact.
""",
        "action_items": [
            {"owner": "Vikas", "task": "Send proposal recap and next steps", "due_date": "2026-04-30"},
            {"owner": "Priya", "task": "Confirm rollout sequence and success metrics", "due_date": "2026-05-01"},
            {"owner": "James", "task": "Return procurement blocker list", "due_date": "2026-05-05"},
        ],
    },
    "weekly status standup": {
        "notes_draft": """Weekly Status Standup - April 30, 2026

Discussion:
- Most updates were operational and did not require live discussion.
- Two blockers need owner-level follow-up: hiring backlog and auth release testing.

Decision:
- Move routine updates to async Slack from next week.

Action items:
- Publish async update template.
- Escalate auth testing blocker to eng leads.
""",
        "brief_markdown": """# Weekly Status Standup Executive Brief

## Why this meeting matters
- This is a candidate to convert from live meeting time into async leverage.

## Prior commitments
- Team agreed status updates should consume less leadership attention.

## Decision needed
- Confirm the move to async updates and reserve live time only for blockers.

## Risks
- Without a template, async updates become inconsistent.
- Engineering blockers may still require a short escalation path.
""",
        "debrief_markdown": """# Weekly Status Standup Debrief

## Decisions made
- Weekly status updates move to async Slack next week.

## Action items
- Operations: publish async update template.
- Engineering: escalate auth testing blocker with owner and deadline.
""",
        "action_items": [
            {"owner": "Operations", "task": "Publish async update template", "due_date": "2026-05-01"},
            {"owner": "Engineering", "task": "Escalate auth testing blocker", "due_date": "2026-05-01"},
        ],
    },
}


def get_demo_workspace_payload(
    event_title: str,
    event_date: str,
    attendees: list[str],
) -> dict[str, Any]:
    template = DEMO_MEETING_TEMPLATES.get(event_title.lower(), {})
    payload = deepcopy(template)
    payload.setdefault("notes_draft", "")
    payload.setdefault(
        "brief_markdown",
        f"# {event_title} Executive Brief\n\n## Why this meeting matters\n- This is a high-visibility meeting in the executive workflow.\n\n## Recommended focus\n- Clarify the key decision, owner, deadline, and next step before the meeting ends.",
    )
    payload.setdefault(
        "debrief_markdown",
        f"# {event_title} Debrief\n\n## Decisions made\n- Capture the critical decision from the meeting.\n\n## Action items\n- Assign owner, due date, and next step.",
    )
    payload.setdefault("action_items", [])
    payload["event_title"] = event_title
    payload["event_date"] = event_date
    payload["attendees"] = attendees
    return payload


def build_demo_plan_reply(message: str) -> str:
    lowered = message.lower()
    if "prioritize" in lowered and "task" in lowered:
        return """## Executive Task Order

1. **Finalise Q2 Revenue Report** because it anchors the board narrative and is already in progress.
2. **CloudOps contract review** because legal risk can block procurement momentum.
3. **Product Review slides** because Monday's leadership meeting will force launch decisions.
4. **Apex follow-up** because it protects the only major expansion motion at risk of slipping.

### What to delegate
- Move the monthly newsletter and OKR formatting work off your critical path.
- Ask an eng lead to summarize the auth PR status before you spend review time.
"""

    if "today" in lowered or "focus" in lowered or "priority" in lowered:
        return """## Morning Chief-of-Staff Brief

- **Top priority:** Finalise the Q2 Revenue Report before noon while focus energy is highest.
- **Most at-risk meeting:** Apex Client Call, because procurement timing can still push the deal to Q3.
- **Blocked decision:** Product launch timing remains exposed until the auth review closes.
- **What to delegate:** Move routine status updates async and ask Priya to own the rollout-success-metrics follow-up for Apex.
"""

    return """## Executive Weekly Plan

- Protect morning deep work for the Q2 Revenue Report and the Monday Product Review story.
- Use the **Apex Client Call** to force a procurement decision date, not just another check-in.
- Convert the **Weekly Status Standup** into an async update and reclaim that hour for decision work.
- End each meeting with explicit owner, due date, and follow-up path so execution does not leak into next week.
"""
