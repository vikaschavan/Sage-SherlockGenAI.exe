// Empty string = relative URL: works on Cloud Run (same origin) and with Vite proxy in dev
const BASE_URL = "";

export const FRONTEND_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

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

export function formatApiError(error, fallback) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("resource_exhausted") ||
    normalized.includes("quota exceeded") ||
    normalized.includes("quota exhausted") ||
    normalized.includes("gemini quota exhausted")
  ) {
    return "Sage is live, but the Gemini free-tier request limit was hit. The demo workspace can still continue using cached executive context.";
  }

  if (normalized.includes("permission_denied") || normalized.includes("api key")) {
    return "Sage is live, but the Gemini API key is invalid or blocked. Demo-mode context should still remain available.";
  }

  if (
    normalized.includes("workspace integrations are not configured") ||
    normalized.includes("workspace oauth is not configured") ||
    normalized.includes("could not locate runnable browser")
  ) {
    return "Sage is live, but Google Workspace access is not configured for Cloud Run. Mock executive context will be used instead of live Gmail or Docs.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return fallback;
  }

  return message || fallback;
}

function buildWorkspaceParams(eventTitle, eventDate, attendees = []) {
  const params = new URLSearchParams();
  params.set("event_title", eventTitle);
  params.set("event_date", eventDate);
  attendees.forEach((attendee) => params.append("attendees", attendee));
  return params.toString();
}

export function buildMeetingSessionId(prefix, eventTitle, eventDate) {
  const slug = `${eventTitle}-${eventDate}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${prefix}-${slug}`;
}

export async function getBackendHealth() {
  const res = await fetch(`${BASE_URL}/health`, {
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function listTasks() {
  const res = await fetch(`${BASE_URL}/tasks`, {
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function createTask(task) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  return parseResponse(res);
}

export async function updateTaskStatus(taskId, status) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse(res);
}

export async function getMeetingWorkspace(eventTitle, eventDate, attendees = []) {
  const query = buildWorkspaceParams(eventTitle, eventDate, attendees);
  const res = await fetch(`${BASE_URL}/meeting-workspace?${query}`, {
    cache: "no-store",
  });
  return parseResponse(res);
}

export async function saveMeetingWorkspaceDraft(eventTitle, eventDate, attendees = [], notesDraft = "") {
  const res = await fetch(`${BASE_URL}/meeting-workspace/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      notes_draft: notesDraft,
    }),
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

export async function getMeetingBrief(eventTitle, eventDate, attendees = [], sessionId) {
  const res = await fetch(`${BASE_URL}/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      user_id: "demo_user",
      session_id: sessionId || buildMeetingSessionId("brief", eventTitle, eventDate),
    }),
  });
  return parseResponse(res);
}

export async function runDebrief(eventTitle, eventDate, attendees = [], notes = "", sessionId) {
  const res = await fetch(`${BASE_URL}/debrief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_title: eventTitle,
      event_date: eventDate,
      attendees,
      meeting_notes: notes,
      user_id: "demo_user",
      session_id: sessionId || buildMeetingSessionId("debrief", eventTitle, eventDate),
    }),
  });
  return parseResponse(res);
}
