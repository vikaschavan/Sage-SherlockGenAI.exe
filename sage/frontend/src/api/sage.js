// Empty string = relative URL: works on Cloud Run (same origin) and with Vite proxy in dev
const BASE_URL = "";

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
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
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
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function runDebrief(eventTitle, eventDate, attendees = [], notes = "") {
  const res = await fetch(`${BASE_URL}/debrief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      notes,
      user_id: "demo_user",
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
