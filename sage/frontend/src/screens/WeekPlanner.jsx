import { useState } from "react";
import { AlertTriangle, Focus, Calendar, TrendingUp } from "lucide-react";
import SagePanel from "../components/SagePanel";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import { planWeek } from "../api/sage";

const themeConfig = {
  strategy: { label: "Strategy", color: "border-cyan-500/40 bg-cyan-500/5", badge: "bg-cyan-500/10 text-cyan-300" },
  "deep-work": { label: "Deep Work", color: "border-emerald-500/40 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-300" },
  communication: { label: "Comms", color: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-300" },
  operations: { label: "Ops", color: "border-violet-500/40 bg-violet-500/5", badge: "bg-violet-500/10 text-violet-300" },
  review: { label: "Review", color: "border-stone-500/40 bg-stone-700/30", badge: "bg-stone-700/50 text-stone-300" },
};

const totalMeetingHours = weekEvents.reduce((sum, day) => sum + (day.meetingHours || 0), 0);
const totalFocusHours = weekEvents.reduce((sum, day) => sum + (day.focusHours || 0), 0);
const deepWorkPct = Math.round((totalFocusHours / (totalMeetingHours + totalFocusHours)) * 100);

function findWeekMeeting(title) {
  return weekEvents.flatMap((day) => day.events).find((event) => event.type === "meeting" && event.title === title) || null;
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
            { label: "Strategic Time", value: `${deepWorkPct}%`, sub: "target >40%", good: deepWorkPct >= 40, icon: Focus },
            { label: "Meeting Load", value: `${totalMeetingHours.toFixed(1)}h`, sub: "target <12h", good: totalMeetingHours < 12, icon: Calendar },
            { label: "Open Priorities", value: highCount, sub: "high priority", good: highCount < 3, icon: TrendingUp },
            { label: "Conflicts", value: weekEvents.filter((day) => day.conflict).length, sub: "schedule clashes", good: false, icon: AlertTriangle },
          ].map(({ label, value, sub, good, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-stone-800 border border-stone-700 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={good ? "text-emerald-400" : "text-amber-400"} />
                <span className="text-xs text-stone-400">{label}</span>
              </div>
              <p className={`text-xl font-bold ${good ? "text-emerald-400" : "text-amber-400"}`}>{value}</p>
              <p className="text-xs text-stone-500">{sub}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Day themes reduce context switching and make executive time easier to protect.
        </p>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Weekly action path</p>
              <p className="text-sm text-stone-500 mt-1">
                The week planner should route into execution, not stay as a read-only calendar.
              </p>
            </div>
            <button
              onClick={() => openWorkflow("today")}
              className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              Open Today
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {weeklyActions.map((item) => (
              <div key={item.title} className="rounded-lg bg-stone-900/70 border border-stone-700 px-4 py-4">
                <p className="text-xs font-semibold text-cyan-200">{item.title}</p>
                <p className="text-sm text-stone-400 mt-2 min-h-12">{item.detail}</p>
                <button
                  onClick={item.action}
                  className="mt-4 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
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
            const dayAction =
              day.conflict
                ? {
                    label: "Review priorities",
                    action: () => openWorkflow("tasks"),
                  }
                : day.events.some((event) => event.title === "Apex Client Call")
                  ? {
                      label: "Open Apex brief",
                      action: () => openWorkflow("brief", apexMeeting),
                    }
                  : day.events.some((event) => event.title === "Product Review")
                    ? {
                        label: "Open debrief",
                        action: () => openWorkflow("debrief", productReviewMeeting),
                      }
                    : {
                        label: "Open Today",
                        action: () => openWorkflow("today"),
                      };
            return (
              <div key={day.date} className={`rounded-xl border p-3 space-y-2 ${theme.color} ${day.conflict ? "ring-1 ring-amber-500/40" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{day.label}</p>
                    <p className="text-xs text-stone-500">{day.date}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${theme.badge}`}>
                    {theme.label}
                  </span>
                </div>

                {day.conflict && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1">
                    <AlertTriangle size={10} />
                    Conflict detected
                  </div>
                )}

                <div className="space-y-1.5">
                  {day.events.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg px-2 py-1.5 text-xs ${
                        event.type === "focus"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-stone-700/50 text-stone-300"
                      }`}
                    >
                      <p className="font-medium truncate">{event.title}</p>
                      {event.duration_min && (
                        <p className={`text-xs mt-0.5 ${event.duration_min > 60 ? "text-amber-400" : "text-stone-500"}`}>
                          {event.duration_min} min{event.duration_min > 60 ? " attention-heavy" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-1 border-t border-stone-700/50 flex justify-between text-xs text-stone-500">
                  <span className="text-emerald-400/70">{day.focusHours}h focus</span>
                  <span className="text-cyan-400/70">{day.meetingHours}h meetings</span>
                </div>
                <button
                  onClick={dayAction.action}
                  className="w-full rounded-lg bg-stone-900/70 hover:bg-stone-900 border border-stone-700 text-stone-200 text-xs font-medium px-3 py-2 transition-colors"
                >
                  {dayAction.label}
                </button>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">High Priority This Week</h3>
          <div className="grid grid-cols-2 gap-2">
            {weekTasks.filter((task) => task.priority === "high").map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs text-stone-300 bg-stone-700/40 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">{task.title}</span>
                {task.due_date && <span className="ml-auto text-stone-500 shrink-0">{task.due_date.slice(5)}</span>}
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
