import { useState } from "react";
import { AlertTriangle, Focus, Calendar, TrendingUp } from "lucide-react";
import SagePanel from "../components/SagePanel";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import { planWeek } from "../api/sage";

const themeConfig = {
  strategy: {
    label: "Strategy",
    color: "border-[color:rgba(15,118,110,0.2)] bg-[var(--sage-accent-soft)]",
    badge: "bg-[rgba(251,247,240,0.8)] text-[var(--sage-accent)] border border-[color:rgba(15,118,110,0.14)]",
  },
  "deep-work": {
    label: "Deep Work",
    color: "border-[color:rgba(47,125,101,0.2)] bg-[var(--sage-emerald-soft)]",
    badge: "bg-[rgba(251,247,240,0.8)] text-[var(--sage-emerald)] border border-[color:rgba(47,125,101,0.14)]",
  },
  communication: {
    label: "Comms",
    color: "border-[color:rgba(161,98,7,0.2)] bg-[var(--sage-amber-soft)]",
    badge: "bg-[rgba(251,247,240,0.8)] text-[var(--sage-amber)] border border-[color:rgba(161,98,7,0.14)]",
  },
  operations: {
    label: "Ops",
    color: "border-[var(--sage-border)] bg-[var(--sage-surface-muted)]",
    badge: "bg-[rgba(251,247,240,0.8)] text-[var(--sage-text)] border border-[var(--sage-border)]",
  },
  review: {
    label: "Review",
    color: "border-[var(--sage-border)] bg-[rgba(251,247,240,0.75)]",
    badge: "bg-[var(--sage-surface-muted)] text-[var(--sage-muted)] border border-[var(--sage-border)]",
  },
};

const totalMeetingHours = weekEvents.reduce((sum, day) => sum + (day.meetingHours || 0), 0);
const totalFocusHours = weekEvents.reduce((sum, day) => sum + (day.focusHours || 0), 0);
const deepWorkPct = Math.round((totalFocusHours / (totalMeetingHours + totalFocusHours)) * 100);

function findWeekMeeting(title) {
  return weekEvents
    .flatMap((day) => day.events)
    .find((event) => event.type === "meeting" && event.title === title) || null;
}

export default function WeekPlanner({
  activeMeeting,
  setActiveMeeting,
  setActiveScreen,
  tasks = mockTasks,
}) {
  const [sessionId] = useState(() => `week-${Date.now()}`);
  const weekTasks = tasks.filter((task) => task.status !== "completed");
  const highCount = weekTasks.filter((task) => task.priority === "high").length;
  const apexMeeting = findWeekMeeting("Apex Client Call");
  const productReviewMeeting = findWeekMeeting("Product Review");

  function openWorkflow(screen, meeting = null) {
    if (meeting) {
      setActiveMeeting?.(meeting);
    }
    setActiveScreen?.(screen);
  }

  const weeklyActions = [
    {
      title: "Protect deep work before the week fragments",
      detail: "Use Tasks to reduce the high-priority list before Wednesday absorbs attention.",
      actionLabel: "Open Tasks",
      action: () => openWorkflow("tasks"),
    },
    {
      title: "Prep the highest-risk external meeting",
      detail: "Apex Client Call should have a decision path and follow-up owner before it starts.",
      actionLabel: "Open Apex brief",
      action: () => openWorkflow("brief", apexMeeting),
    },
    {
      title: "Close the product-review loop",
      detail: "Use the debrief to turn launch-risk discussion into owners and deadlines.",
      actionLabel: "Open Product debrief",
      action: () => openWorkflow("debrief", productReviewMeeting),
    },
  ];

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: "Strategic Time",
              value: `${deepWorkPct}%`,
              sub: "target >40%",
              good: deepWorkPct >= 40,
              icon: Focus,
            },
            {
              label: "Meeting Load",
              value: `${totalMeetingHours.toFixed(1)}h`,
              sub: "target <12h",
              good: totalMeetingHours < 12,
              icon: Calendar,
            },
            {
              label: "Open Priorities",
              value: highCount,
              sub: "high priority",
              good: highCount < 3,
              icon: TrendingUp,
            },
            {
              label: "Conflicts",
              value: weekEvents.filter((day) => day.conflict).length,
              sub: "schedule clashes",
              good: false,
              icon: AlertTriangle,
            },
          ].map(({ label, value, sub, good, icon: Icon }) => (
            <div key={label} className="sage-card rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={good ? "text-[var(--sage-emerald)]" : "text-[var(--sage-amber)]"} />
                <span className="text-xs text-[var(--sage-muted)]">{label}</span>
              </div>
              <p className={`text-xl font-bold ${good ? "text-[var(--sage-emerald)]" : "text-[var(--sage-amber)]"}`}>
                {value}
              </p>
              <p className="text-xs text-[var(--sage-soft)]">{sub}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--sage-muted)] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--sage-accent)] inline-block" /> Day themes reduce context
          switching and make executive time easier to protect.
        </p>

        <div className="sage-surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
                Weekly action path
              </p>
              <p className="text-sm text-[var(--sage-muted)] mt-1">
                The week planner should route into execution, not stay as a read-only calendar.
              </p>
            </div>
            <button
              onClick={() => openWorkflow("today")}
              className="sage-btn-secondary px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Open Today
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {weeklyActions.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] px-4 py-4"
              >
                <p className="text-xs font-semibold text-[var(--sage-accent)]">{item.title}</p>
                <p className="text-sm text-[var(--sage-muted)] mt-2 min-h-12 leading-6">{item.detail}</p>
                <button
                  onClick={item.action}
                  className="sage-btn-primary mt-4 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {weekEvents.map((day) => {
            const theme = themeConfig[day.theme] || themeConfig.review;
            const dayAction = day.conflict
              ? { label: "Review priorities", action: () => openWorkflow("tasks") }
              : day.events.some((event) => event.title === "Apex Client Call")
                ? { label: "Open Apex brief", action: () => openWorkflow("brief", apexMeeting) }
                : day.events.some((event) => event.title === "Product Review")
                  ? { label: "Open debrief", action: () => openWorkflow("debrief", productReviewMeeting) }
                  : { label: "Open Today", action: () => openWorkflow("today") };

            return (
              <div
                key={day.date}
                className={`rounded-2xl border p-3 space-y-2 ${theme.color} ${
                  day.conflict ? "ring-1 ring-[color:rgba(161,98,7,0.22)]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--sage-text)]">{day.label}</p>
                    <p className="text-xs text-[var(--sage-muted)]">{day.date}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${theme.badge}`}>
                    {theme.label}
                  </span>
                </div>

                {day.conflict && (
                  <div className="flex items-center gap-1 text-xs text-[var(--sage-amber)] bg-[rgba(251,247,240,0.72)] rounded px-2 py-1 border border-[color:rgba(161,98,7,0.16)]">
                    <AlertTriangle size={10} />
                    Conflict detected
                  </div>
                )}

                <div className="space-y-1.5">
                  {day.events.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg px-2 py-1.5 text-xs border ${
                        event.type === "focus"
                          ? "bg-[rgba(251,247,240,0.72)] text-[var(--sage-emerald)] border-[color:rgba(47,125,101,0.16)]"
                          : "bg-[rgba(251,247,240,0.62)] text-[var(--sage-text)] border-[var(--sage-border)]"
                      }`}
                    >
                      <p className="font-medium truncate">{event.title}</p>
                      {event.duration_min && (
                        <p
                          className={`text-xs mt-0.5 ${
                            event.duration_min > 60 ? "text-[var(--sage-amber)]" : "text-[var(--sage-muted)]"
                          }`}
                        >
                          {event.duration_min} min{event.duration_min > 60 ? " attention-heavy" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-1 border-t border-[rgba(186,168,143,0.45)] flex justify-between text-xs text-[var(--sage-muted)]">
                  <span className="text-[var(--sage-emerald)]">{day.focusHours}h focus</span>
                  <span className="text-[var(--sage-accent)]">{day.meetingHours}h meetings</span>
                </div>
                <button
                  onClick={dayAction.action}
                  className="sage-btn-secondary w-full rounded-lg text-xs font-medium px-3 py-2 transition-colors"
                >
                  {dayAction.label}
                </button>
              </div>
            );
          })}
        </div>

        <div className="sage-surface rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[var(--sage-text)] mb-3">High Priority This Week</h3>
          <div className="grid grid-cols-2 gap-2">
            {weekTasks
              .filter((task) => task.priority === "high")
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-xs text-[var(--sage-text)] bg-[rgba(251,247,240,0.72)] border border-[var(--sage-border)] rounded-xl px-3 py-2"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--sage-rose)] shrink-0" />
                  <span className="truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="ml-auto text-[var(--sage-muted)] shrink-0">{task.due_date.slice(5)}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <SagePanel
        title="Week Planner AI"
        contextLabel={activeMeeting ? `Active meeting: ${activeMeeting.title}` : "Planning across the full week"}
        proactive={[
          `**Weekly posture:** ${totalMeetingHours.toFixed(1)} hours of meetings, ${totalFocusHours} hours of focus, ${highCount} open high-priority tasks.`,
          weekEvents.some((day) => day.conflict)
            ? "**Wednesday has a scheduling conflict** and should be resolved before it becomes an execution blocker."
            : "**No scheduling conflicts are currently visible** in the weekly plan.",
          "Try: *Plan my week around the Q2 report, the Apex client call, and the auth review.*",
        ]}
        onAsk={(message) => planWeek(message, sessionId)}
      />
    </div>
  );
}
