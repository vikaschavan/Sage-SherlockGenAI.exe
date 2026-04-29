// Empty string = relative URL: works on Cloud Run (same origin) and with Vite proxy in dev
const BASE_URL = "";

async function parseResponse(res) {
  if (res.ok) {
    return res.json();
  }

  let detail = `API error ${res.status}`;
  try {
    const body = await res.json();
    detail = body.detail || detail;
  } catch {
    // Ignore JSON parsing errors for non-JSON responses.
  }
  throw new Error(detail);
}

export async function getBackendHealth() {
  const res = await fetch(`${BASE_URL}/health`, {
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function planWeek(message, sessionId = "week-session") {
  const res = await fetch(`${BASE_URL}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      user_id: "demo_user",
    }),
  });
  return parseResponse(res);
}

export async function getMeetingBrief(eventTitle, eventDate, attendees = []) {
  const res = await fetch(`${BASE_URL}/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      user_id: "demo_user",
    }),
  });
  return parseResponse(res);
}

export async function runDebrief(eventTitle, eventDate, attendees = [], notes = "") {
  const res = await fetch(`${BASE_URL}/debrief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      meeting_notes: notes,
      user_id: "demo_user",
    }),
  });
  return parseResponse(res);
}
