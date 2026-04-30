import { useState } from "react";
import MetricRing from "../components/MetricRing";
import { leaderQuotes } from "../data/productivityTips";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, Clock3, ShieldAlert } from "lucide-react";

const totalHours = weekEvents.reduce((sum, day) => sum + day.meetingHours + day.focusHours, 0);
const focusHours = weekEvents.reduce((sum, day) => sum + day.focusHours, 0);
const meetingHours = weekEvents.reduce((sum, day) => sum + day.meetingHours, 0);
const strategicRatio = Math.round((focusHours / totalHours) * 100);
const completedTaskRatio = Math.round((mockTasks.filter((task) => task.status === "completed").length / mockTasks.length) * 100);

const signals = [
  {
    icon: ShieldAlert,
    title: "Commitments at risk",
    detail: "Launch confidence is gated by the auth refactor review and stakeholder timeline reset.",
    tone: "amber",
  },
  {
    icon: Clock3,
    title: "Coordination overhead",
    detail: `${meetingHours.toFixed(1)} hours of meetings this week is high for an executive operating cadence.`,
    tone: "rose",
  },
  {
    icon: TrendingUp,
    title: "Strategic capacity",
    detail: `${focusHours.toFixed(1)} hours of focus keeps room for decision-making, but only if status meetings stay contained.`,
    tone: "emerald",
  },
];

export default function Insights() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quote = leaderQuotes[quoteIndex];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-cyan-900/40 to-stone-900/60 border border-cyan-500/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setQuoteIndex((current) => (current - 1 + leaderQuotes.length) % leaderQuotes.length)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base text-white font-medium italic">"{quote.quote}"</p>
            <p className="text-sm text-cyan-300 mt-2">- {quote.author}</p>
            <span className="text-xs text-cyan-300/80 bg-cyan-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
              {quote.framework}
            </span>
          </div>
          <button
            onClick={() => setQuoteIndex((current) => (current + 1) % leaderQuotes.length)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-4">Executive Operating Signals</h3>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={strategicRatio}
              max={100}
              color={strategicRatio >= 40 ? "#10b981" : "#f59e0b"}
              label="Strategic Time"
              sublabel="target >40%"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={completedTaskRatio}
              max={100}
              color={completedTaskRatio >= 70 ? "#10b981" : "#f59e0b"}
              label="Commitments Closed"
              sublabel="this week"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className={`text-3xl font-bold ${meetingHours > 12 ? "text-rose-400" : "text-stone-300"}`}>
              {meetingHours.toFixed(1)}h
            </div>
            <p className="text-xs font-medium text-stone-300 text-center">Coordination Time</p>
            <p className="text-xs text-stone-500 text-center">target &lt;12h</p>
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-cyan-300">
              {weekEvents.filter((day) => day.conflict).length}
            </div>
            <p className="text-xs font-medium text-stone-300 text-center">Schedule Conflicts</p>
            <p className="text-xs text-stone-500 text-center">needs intervention</p>
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-amber-300">
              {mockTasks.filter((task) => task.priority === "high" && task.status !== "completed").length}
            </div>
            <p className="text-xs font-medium text-stone-300 text-center">Open High Stakes</p>
            <p className="text-xs text-stone-500 text-center">needs ownership</p>
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-emerald-400">
              {focusHours.toFixed(1)}h
            </div>
            <p className="text-xs font-medium text-stone-300 text-center">Protected Focus</p>
            <p className="text-xs text-stone-500 text-center">decision space</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-stone-800 border border-stone-700 p-5">
        <h3 className="text-sm font-semibold text-stone-300 mb-4">Strategic vs Coordination Load</h3>
        <div className="flex items-end gap-3 h-28">
          {weekEvents.map((day) => {
            const total = day.focusHours + day.meetingHours;
            const focusPct = (day.focusHours / (total || 1)) * 100;
            const meetingPct = (day.meetingHours / (total || 1)) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-20 gap-0.5">
                  <div
                    className="w-full bg-rose-500/60 rounded-t"
                    style={{ height: `${meetingPct * 0.8}%` }}
                    title={`${day.meetingHours}h coordination`}
                  />
                  <div
                    className="w-full bg-emerald-500/70 rounded-t"
                    style={{ height: `${focusPct * 0.8}%` }}
                    title={`${day.focusHours}h strategic focus`}
                  />
                </div>
                <span className="text-xs text-stone-500">{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" /> Strategic focus
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/60" /> Coordination
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-stone-300">What Sage would challenge this week</h3>
        {signals.map(({ icon: Icon, title, detail, tone }) => (
          <div
            key={title}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                : tone === "rose"
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            }`}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm mt-1">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
