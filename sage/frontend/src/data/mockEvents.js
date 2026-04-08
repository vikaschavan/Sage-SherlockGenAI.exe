const today = new Date();
const fmt = (d) => d.toISOString().slice(0, 10);
const todayStr = fmt(today);

function todayAt(h, m = 0) {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const todayEvents = [
  {
    id: "ev1",
    title: "Product Review",
    start: todayAt(9, 0),
    end: todayAt(10, 30),
    duration_min: 90,
    attendees: ["alice@company.com", "bob@company.com", "carol@company.com"],
    location: "Google Meet",
    type: "meeting",
  },
  {
    id: "ev2",
    title: "Deep Work: Q2 Report",
    start: todayAt(11, 0),
    end: todayAt(13, 0),
    duration_min: 120,
    attendees: [],
    type: "focus",
  },
  {
    id: "ev3",
    title: "Lunch / Break",
    start: todayAt(13, 0),
    end: todayAt(14, 0),
    duration_min: 60,
    attendees: [],
    type: "break",
  },
  {
    id: "ev4",
    title: "Apex Client Call",
    start: todayAt(14, 0),
    end: todayAt(15, 30),
    duration_min: 90,
    attendees: ["priya@apex.com", "james@apex.com"],
    location: "Zoom",
    type: "meeting",
  },
  {
    id: "ev5",
    title: "Weekly Status Standup",
    start: todayAt(16, 0),
    end: todayAt(17, 0),
    duration_min: 60,
    attendees: ["team@company.com"],
    type: "meeting",
    isAsync: true,
  },
];

export const weekEvents = [
  { date: todayStr, label: "Mon", theme: "strategy", events: todayEvents, meetingHours: 3.5, focusHours: 2 },
  {
    date: fmt(new Date(today.getTime() + 86400000)),
    label: "Tue",
    theme: "deep-work",
    events: [
      { id: "w1", title: "Auth PR Review", start: "", duration_min: 30, type: "focus" },
      { id: "w2", title: "1:1 with Manager", start: "", duration_min: 50, type: "meeting", attendees: ["manager@company.com"] },
    ],
    meetingHours: 0.8,
    focusHours: 4,
  },
  {
    date: fmt(new Date(today.getTime() + 2 * 86400000)),
    label: "Wed",
    theme: "communication",
    events: [
      { id: "w3", title: "All-hands", start: "", duration_min: 60, type: "meeting" },
      { id: "w4", title: "OKR Review", start: "", duration_min: 90, type: "meeting" },
      { id: "w5", title: "Stakeholder Update", start: "", duration_min: 45, type: "meeting" },
    ],
    meetingHours: 3.2,
    focusHours: 1,
    conflict: true,
  },
  {
    date: fmt(new Date(today.getTime() + 3 * 86400000)),
    label: "Thu",
    theme: "operations",
    events: [
      { id: "w6", title: "CloudOps Negotiation", start: "", duration_min: 60, type: "meeting" },
      { id: "w7", title: "Deep Work: OKRs", start: "", duration_min: 120, type: "focus" },
    ],
    meetingHours: 1,
    focusHours: 3,
  },
  {
    date: fmt(new Date(today.getTime() + 4 * 86400000)),
    label: "Fri",
    theme: "review",
    events: [
      { id: "w8", title: "Team Retrospective", start: "", duration_min: 50, type: "meeting" },
      { id: "w9", title: "Week Review & Planning", start: "", duration_min: 60, type: "focus" },
    ],
    meetingHours: 0.8,
    focusHours: 2.5,
  },
];
