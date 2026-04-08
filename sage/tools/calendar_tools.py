"""
Google Calendar tool functions.

These are plain Python functions exposed to ADK agents as tools.
Each function is self-contained: it calls the Google Calendar API
and returns structured dicts that the agent can reason over.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sage.auth.google_oauth import calendar_service


def list_events(
    days_ahead: int = 7,
    max_results: int = 20,
    calendar_id: str = "primary",
) -> list[dict]:
    """
    List upcoming calendar events.

    Args:
        days_ahead: How many days forward to look (default 7).
        max_results: Max number of events to return.
        calendar_id: Calendar to query (default "primary").

    Returns:
        List of event dicts with id, title, start, end, attendees, description.
    """
    service = calendar_service()
    now = datetime.now(timezone.utc)
    time_max = now + timedelta(days=days_ahead)

    result = (
        service.events()
        .list(
            calendarId=calendar_id,
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events = []
    for item in result.get("items", []):
        start = item["start"].get("dateTime", item["start"].get("date", ""))
        end = item["end"].get("dateTime", item["end"].get("date", ""))
        events.append(
            {
                "id": item.get("id"),
                "title": item.get("summary", "(No title)"),
                "start": start,
                "end": end,
                "description": item.get("description", ""),
                "location": item.get("location", ""),
                "attendees": [
                    a.get("email") for a in item.get("attendees", [])
                ],
                "html_link": item.get("htmlLink", ""),
            }
        )
    return events


def find_free_slots(
    date_str: str,
    duration_minutes: int = 60,
    working_hours_start: int = 9,
    working_hours_end: int = 18,
    calendar_id: str = "primary",
) -> list[dict]:
    """
    Find available time slots on a given date.

    Args:
        date_str: Date in YYYY-MM-DD format.
        duration_minutes: Required slot length in minutes.
        working_hours_start: Start of working day (hour, 24h).
        working_hours_end: End of working day (hour, 24h).
        calendar_id: Calendar to check.

    Returns:
        List of free slots with start and end times.
    """
    service = calendar_service()
    date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    day_start = date.replace(hour=working_hours_start, minute=0, second=0)
    day_end = date.replace(hour=working_hours_end, minute=0, second=0)

    result = (
        service.freebusy()
        .query(
            body={
                "timeMin": day_start.isoformat(),
                "timeMax": day_end.isoformat(),
                "items": [{"id": calendar_id}],
            }
        )
        .execute()
    )

    busy_periods = result["calendars"][calendar_id]["busy"]
    busy = [
        (
            datetime.fromisoformat(b["start"]),
            datetime.fromisoformat(b["end"]),
        )
        for b in busy_periods
    ]

    slots = []
    cursor = day_start
    for busy_start, busy_end in sorted(busy):
        slot_end = cursor + timedelta(minutes=duration_minutes)
        if slot_end <= busy_start:
            slots.append({"start": cursor.isoformat(), "end": slot_end.isoformat()})
        cursor = max(cursor, busy_end)

    # Check remaining time after last busy period
    slot_end = cursor + timedelta(minutes=duration_minutes)
    if slot_end <= day_end:
        slots.append({"start": cursor.isoformat(), "end": slot_end.isoformat()})

    return slots


def create_event(
    title: str,
    start_datetime: str,
    end_datetime: str,
    description: str = "",
    attendees: Optional[list[str]] = None,
    calendar_id: str = "primary",
) -> dict:
    """
    Create a new Google Calendar event.

    Args:
        title: Event title.
        start_datetime: ISO 8601 start time (e.g. "2026-04-08T09:00:00+05:30").
        end_datetime: ISO 8601 end time.
        description: Optional event description / notes.
        attendees: Optional list of attendee email addresses.
        calendar_id: Calendar to create the event in.

    Returns:
        Created event dict with id and html_link.
    """
    service = calendar_service()

    # Ensure datetimes include timezone — append UTC offset if bare ISO string
    def _ensure_tz(dt: str) -> str:
        if dt and "T" in dt and "+" not in dt and dt[-1] != "Z" and "-" not in dt[10:]:
            return dt + "Z"
        return dt

    start_datetime = _ensure_tz(start_datetime)
    end_datetime = _ensure_tz(end_datetime)

    event_body: dict = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_datetime, "timeZone": "UTC"},
        "end": {"dateTime": end_datetime, "timeZone": "UTC"},
    }
    if attendees:
        event_body["attendees"] = [{"email": e} for e in attendees]

    created = (
        service.events()
        .insert(calendarId=calendar_id, body=event_body, sendUpdates="none")
        .execute()
    )
    return {"id": created["id"], "title": created["summary"], "html_link": created.get("htmlLink")}


def detect_conflicts(days_ahead: int = 7, calendar_id: str = "primary") -> list[dict]:
    """
    Detect overlapping events in the upcoming period.

    Returns:
        List of conflict pairs, each with two overlapping event dicts.
    """
    events = list_events(days_ahead=days_ahead, calendar_id=calendar_id)
    conflicts = []

    for i, ev1 in enumerate(events):
        for ev2 in events[i + 1 :]:
            s1, e1 = ev1["start"], ev1["end"]
            s2, e2 = ev2["start"], ev2["end"]
            if s1 and e1 and s2 and e2:
                if s1 < e2 and s2 < e1:
                    conflicts.append({"event_a": ev1, "event_b": ev2})

    return conflicts
