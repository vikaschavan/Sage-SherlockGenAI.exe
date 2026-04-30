import { useState } from "react";
import MetricRing from "../components/MetricRing";
import { leaderQuotes } from "../data/productivityTips";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock3,
  ShieldAlert,
} from "lucide-react";

const totalHours = weekEvents.reduce((sum, day) => sum + day.meetingHours + day.focusHours, 0);
const focusHours = weekEvents.reduce((sum, day) => sum + day.focusHours, 0);
const meetingHours = weekEvents.reduce((sum, day) => sum + day.meetingHours, 0);
const strategicRatio = Math.round((focusHours / totalHours) * 100);
const completedTaskRatio = Math.round(
  (mockTasks.filter((task) => task.status === "completed").length / mockTasks.length) * 100,
);

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
      <div className="rounded-2xl border border-[var(--sage-border)] bg-[linear-gradient(135deg,rgba(15,118,110,0.08),rgba(251,247,240,0.94),rgba(161,98,7,0.08))] p-5 shadow-[var(--sage-shadow)]">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() =>
              setQuoteIndex((current) => (current - 1 + leaderQuotes.length) % leaderQuotes.length)
            }
            className="text-[var(--sage-soft)] hover:text-[var(--sage-text)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base text-[var(--sage-text)] font-medium italic">"{quote.quote}"</p>
            <p className="text-sm text-[var(--sage-accent)] mt-2">- {quote.author}</p>
            <span className="text-xs text-[var(--sage-accent)] bg-[var(--sage-accent-soft)] px-2 py-0.5 rounded-full mt-1 inline-block border border-[color:rgba(15,118,110,0.14)]">
              {quote.framework}
            </span>
          </div>
          <button
            onClick={() => setQuoteIndex((current) => (current + 1) % leaderQuotes.length)}
            className="text-[var(--sage-soft)] hover:text-[var(--sage-text)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--sage-text)] mb-4">Executive Operating Signals</h3>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={strategicRatio}
              max={100}
              color={strategicRatio >= 40 ? "#2f7d65" : "#a16207"}
              label="Strategic Time"
              sublabel="target >40%"
            />
          </div>
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={completedTaskRatio}
              max={100}
              color={completedTaskRatio >= 70 ? "#2f7d65" : "#a16207"}
              label="Commitments Closed"
              sublabel="this week"
            />
          </div>
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-3">
            <div
              className={`text-3xl font-bold ${
                meetingHours > 12 ? "text-[var(--sage-rose)]" : "text-[var(--sage-text)]"
              }`}
            >
              {meetingHours.toFixed(1)}h
            </div>
            <p className="text-xs font-medium text-[var(--sage-text)] text-center">Coordination Time</p>
            <p className="text-xs text-[var(--sage-soft)] text-center">target &lt;12h</p>
          </div>
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-[var(--sage-accent)]">
              {weekEvents.filter((day) => day.conflict).length}
            </div>
            <p className="text-xs font-medium text-[var(--sage-text)] text-center">Schedule Conflicts</p>
            <p className="text-xs text-[var(--sage-soft)] text-center">needs intervention</p>
          </div>
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-[var(--sage-amber)]">
              {mockTasks.filter((task) => task.priority === "high" && task.status !== "completed").length}
            </div>
            <p className="text-xs font-medium text-[var(--sage-text)] text-center">Open High Stakes</p>
            <p className="text-xs text-[var(--sage-soft)] text-center">needs ownership</p>
          </div>
          <div className="sage-card rounded-2xl p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-[var(--sage-emerald)]">{focusHours.toFixed(1)}h</div>
            <p className="text-xs font-medium text-[var(--sage-text)] text-center">Protected Focus</p>
            <p className="text-xs text-[var(--sage-soft)] text-center">decision space</p>
          </div>
        </div>
      </div>

      <div className="sage-surface rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--sage-text)] mb-4">Strategic vs Coordination Load</h3>
        <div className="flex items-end gap-3 h-28">
          {weekEvents.map((day) => {
            const total = day.focusHours + day.meetingHours;
            const focusPct = (day.focusHours / (total || 1)) * 100;
            const meetingPct = (day.meetingHours / (total || 1)) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-20 gap-0.5">
                  <div
                    className="w-full bg-[rgba(180,83,74,0.65)] rounded-t"
                    style={{ height: `${meetingPct * 0.8}%` }}
                    title={`${day.meetingHours}h coordination`}
                  />
                  <div
                    className="w-full bg-[rgba(47,125,101,0.75)] rounded-t"
                    style={{ height: `${focusPct * 0.8}%` }}
                    title={`${day.focusHours}h strategic focus`}
                  />
                </div>
                <span className="text-xs text-[var(--sage-muted)]">{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--sage-emerald)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[rgba(47,125,101,0.75)]" /> Strategic focus
          </span>
          <span className="flex items-center gap-1.5 text-[var(--sage-rose)]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[rgba(180,83,74,0.65)]" /> Coordination
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--sage-text)]">What Sage would challenge this week</h3>
        {signals.map(({ icon: Icon, title, detail, tone }) => (
          <div
            key={title}
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              tone === "amber"
                ? "border-[color:rgba(161,98,7,0.18)] bg-[var(--sage-amber-soft)] text-[var(--sage-amber)]"
                : tone === "rose"
                  ? "border-[color:rgba(180,83,74,0.18)] bg-[var(--sage-rose-soft)] text-[var(--sage-rose)]"
                  : "border-[color:rgba(47,125,101,0.18)] bg-[var(--sage-emerald-soft)] text-[var(--sage-emerald)]"
            }`}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm mt-1 leading-6">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
