"""
Notification and document creation tool functions.

Creates Google Docs (meeting briefs, weekly plans) and sends
Google Chat messages as proactive notifications.
"""

from datetime import datetime

from sage.auth.google_oauth import docs_service, gmail_service


# ---------------------------------------------------------------------------
# Google Docs
# ---------------------------------------------------------------------------

def create_doc(title: str, body_markdown: str) -> dict:
    """
    Create a new Google Doc with the given content.

    Args:
        title: Document title.
        body_markdown: Plain text / markdown content for the doc body.

    Returns:
        Dict with doc_id and doc_url.
    """
    service = docs_service()

    # Create empty doc
    doc = service.documents().create(body={"title": title}).execute()
    doc_id = doc["documentId"]

    # Insert content
    requests = [
        {
            "insertText": {
                "location": {"index": 1},
                "text": body_markdown,
            }
        }
    ]
    service.documents().batchUpdate(
        documentId=doc_id, body={"requests": requests}
    ).execute()

    return {
        "doc_id": doc_id,
        "doc_url": f"https://docs.google.com/document/d/{doc_id}/edit",
        "title": title,
    }


# ---------------------------------------------------------------------------
# Gmail notifications
# ---------------------------------------------------------------------------

def send_email_summary(
    to_emails: list[str],
    subject: str,
    body: str,
) -> dict:
    """
    Send an email summary to a list of recipients via Gmail.

    Args:
        to_emails: List of recipient email addresses.
        subject: Email subject.
        body: Plain text email body.

    Returns:
        Dict with message_id and status.
    """
    import base64
    from email.mime.text import MIMEText

    service = gmail_service()

    recipients = ", ".join(to_emails)
    message = MIMEText(body)
    message["to"] = recipients
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    sent = service.users().messages().send(
        userId="me", body={"raw": raw}
    ).execute()

    return {"message_id": sent["id"], "status": "sent", "to": recipients}


# ---------------------------------------------------------------------------
# Weekly / daily plan document helpers
# ---------------------------------------------------------------------------

def format_weekly_plan(
    events: list[dict],
    tasks: list[dict],
    conflicts: list[dict],
    free_slots: dict[str, list[dict]],
) -> str:
    """
    Render a structured weekly plan as markdown text.

    Args:
        events: List of calendar events for the week.
        tasks: List of prioritised tasks.
        conflicts: List of detected calendar conflicts.
        free_slots: Dict mapping date string to list of free slot dicts.

    Returns:
        Formatted markdown string suitable for a Google Doc.
    """
    lines = [
        f"# Weekly Plan — {datetime.now().strftime('%B %d, %Y')}",
        "",
        "## Upcoming Events",
    ]

    for ev in events:
        title = ev.get("title") or ev.get("summary", "(No title)")
        start = ev.get("start") or ev.get("start_datetime", "")
        lines.append(f"- **{title}** — {start}")
        attendees = ev.get("attendees", [])
        if attendees:
            lines.append(f"  Attendees: {', '.join(attendees)}")

    lines += ["", "## Tasks This Week"]
    high = [t for t in tasks if t.get("priority") == "high"]
    medium = [t for t in tasks if t.get("priority") == "medium"]
    low = [t for t in tasks if t.get("priority") == "low"]

    for label, group in [("High Priority", high), ("Medium Priority", medium), ("Low Priority", low)]:
        if group:
            lines.append(f"\n### {label}")
            for t in group:
                due = f" (due {t['due_date']})" if t.get("due_date") else ""
                lines.append(f"- [ ] {t['title']}{due}")

    if conflicts:
        lines += ["", "## ⚠️ Scheduling Conflicts"]
        for c in conflicts:
            a = c.get("event_a", c) if isinstance(c, dict) else {}
            b = c.get("event_b", {})
            a_title = a.get("title") or a.get("summary", "Event A")
            b_title = b.get("title") or b.get("summary", "Event B")
            lines.append(f"- **{a_title}** overlaps with **{b_title}**")

    if free_slots:
        lines += ["", "## Available Focus Slots"]
        for date, slots in free_slots.items():
            lines.append(f"\n**{date}**")
            for s in slots[:3]:
                lines.append(f"- {s['start']} → {s['end']}")

    return "\n".join(lines)


def format_meeting_brief(
    event: dict,
    relevant_emails: list[dict],
    relevant_files: list[dict],
    linked_tasks: list[dict],
    previous_notes: list[dict],
) -> str:
    """
    Render a pre-meeting context brief as markdown text.

    Args:
        event: Calendar event dict.
        relevant_emails: Gmail threads related to this meeting.
        relevant_files: Drive files related to this meeting.
        linked_tasks: Open tasks linked to this meeting/project.
        previous_notes: Past meeting notes for this topic.

    Returns:
        Formatted markdown string for a Google Doc brief.
    """
    title = event.get("title") or event.get("summary") or "Meeting"
    start = event.get("start") or event.get("start_datetime") or event.get("event_date") or "TBD"
    end = event.get("end") or event.get("end_datetime") or "TBD"

    lines = [
        f"# Meeting Brief: {title}",
        f"**Time:** {start} → {end}",
    ]
    if event.get("attendees"):
        lines.append(f"**Attendees:** {', '.join(event['attendees'])}")
    lines.append("")

    if previous_notes:
        lines.append("## Previous Meeting Notes")
        for note in previous_notes[:2]:
            lines.append(f"### {note.get('title', 'Notes')}")
            lines.append(note.get("content", "")[:500] + "...")
            lines.append("")

    if relevant_emails:
        lines.append("## Related Email Threads")
        for email in relevant_emails[:3]:
            subject = email.get("subject", "(No subject)")
            sender = email.get("from_email", "")
            date = email.get("date", "")
            snippet = email.get("snippet", "")
            lines.append(f"- **{subject}** from {sender} ({date})")
            lines.append(f"  > {snippet}")
        lines.append("")

    if relevant_files:
        lines.append("## Related Drive Files")
        for f in relevant_files[:3]:
            name = f.get("name", "Untitled file")
            link = f.get("web_view_link", "")
            modified_time = f.get("modified_time", "")
            lines.append(f"- [{name}]({link}) — modified {modified_time}")
        lines.append("")

    if linked_tasks:
        lines.append("## Open Action Items")
        for t in linked_tasks:
            due = f" (due {t['due_date']})" if t.get("due_date") else ""
            lines.append(f"- [ ] {t.get('title', 'Untitled task')}{due}")

    return "\n".join(lines)
