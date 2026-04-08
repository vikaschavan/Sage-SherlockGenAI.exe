import { useState } from "react";
import { AlertTriangle, Focus, Calendar, TrendingUp } from "lucide-react";
import SagePanel from "../components/SagePanel";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import { planWeek } from "../api/sage";

const themeConfig = {
  strategy: { label: "Strategy", color: "border-indigo-500/50 bg-indigo-500/5", badge: "bg-teal-600/20 text-teal-300" },
  "deep-work": { label: "Deep Work", color: "border-emerald-500/50 bg-emerald-500/5", badge: "bg-emerald-600/20 text-emerald-300" },
  communication: { label: "Comms", color: "border-amber-500/50 bg-amber-500/5", badge: "bg-amber-600/20 text-amber-300" },
  operations: { label: "Ops", color: "border-violet-500/50 bg-violet-500/5", badge: "bg-violet-600/20 text-violet-300" },
  review: { label: "Review", color: "border-stone-500/50 bg-stone-700/30", badge: "bg-stone-600/30 text-stone-300" },
};

const weekTasks = mockTasks.filter((t) => t.status !== "completed");
const highCount = weekTasks.filter((t) => t.priority === "high").length;
const totalMeetHrs = weekEvents.reduce((s, d) => s + (d.meetingHours || 0), 0);
const totalFocusHrs = weekEvents.reduce((s, d) => s + (d.focusHours || 0), 0);
const deepWorkPct = Math.round((totalFocusHrs / (totalMeetHrs + totalFocusHrs)) * 100);

export default function WeekPlanner() {
  const [sessionId] = useState(() => `week-${Date.now()}`);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Metrics bar */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Deep Work %", value: `${deepWorkPct}%`, sub: "target >40%", good: deepWorkPct >= 40, icon: Focus },
            { label: "Meeting Load", value: `${totalMeetHrs.toFixed(1)}hr`, sub: "target <12hr/wk", good: totalMeetHrs < 12, icon: Calendar },
            { label: "Open Tasks", value: highCount, sub: "high priority", good: highCount < 3, icon: TrendingUp },
            { label: "Conflicts", value: weekEvents.filter((d) => d.conflict).length, sub: "scheduling clash", good: false, icon: AlertTriangle },
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

        {/* Day theming note */}
        <p className="text-xs text-stone-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Jack Dorsey day theming — each day has a focus to avoid context switching
        </p>

        {/* 5-day grid */}
        <div className="grid grid-cols-5 gap-3">
          {weekEvents.map((day) => {
            const theme = themeConfig[day.theme] || themeConfig.review;
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
                  {day.events.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className={`rounded-lg px-2 py-1.5 text-xs ${
                        ev.type === "focus"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-stone-700/50 text-stone-300"
                      }`}
                    >
                      <p className="font-medium truncate">{ev.title}</p>
                      {ev.duration_min && (
                        <p className={`text-xs mt-0.5 ${ev.duration_min > 60 ? "text-amber-400" : "text-stone-500"}`}>
                          {ev.duration_min}min{ev.duration_min > 60 ? " ⚠️" : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-1 border-t border-stone-700/50 flex justify-between text-xs text-stone-500">
                  <span className="text-emerald-400/70">{day.focusHours}hr focus</span>
                  <span className="text-teal-400/70">{day.meetingHours}hr mtg</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Task overview */}
        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-3">High Priority This Week</h3>
          <div className="grid grid-cols-2 gap-2">
            {weekTasks.filter((t) => t.priority === "high").map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs text-stone-300 bg-stone-700/40 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">{t.title}</span>
                {t.due_date && <span className="ml-auto text-stone-500 shrink-0">{t.due_date.slice(5)}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sage panel */}
      <SagePanel
        title="Week Planner AI"
        proactive={[
          `**This week:** ${totalMeetHrs.toFixed(1)}hr meetings, ${totalFocusHrs}hr focus, ${highCount} high-priority tasks open.`,
          weekEvents.some((d) => d.conflict)
            ? "⚠️ **Wednesday has a conflict** — two meetings overlap. Ask me to resolve it."
            : "✅ No scheduling conflicts detected.",
          "Try: *'Plan my week — I need 4hr to finish the Q2 report'*",
        ]}
        onAsk={(msg) => planWeek(msg, sessionId)}
      />
    </div>
  );
}
