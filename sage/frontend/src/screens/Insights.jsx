import { useState } from "react";
import MetricRing from "../components/MetricRing";
import { leaderQuotes } from "../data/productivityTips";
import { weekEvents } from "../data/mockEvents";
import { mockTasks } from "../data/mockTasks";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, Zap } from "lucide-react";

const totalHrs = weekEvents.reduce((s, d) => s + d.meetingHours + d.focusHours, 0);
const focusHrs = weekEvents.reduce((s, d) => s + d.focusHours, 0);
const meetHrs = weekEvents.reduce((s, d) => s + d.meetingHours, 0);

const metrics = {
  deepWork: Math.round((focusHrs / totalHrs) * 100),
  meetingLoad: meetHrs,
  mitCompletion: 67,
  focusStreak: 3,
  frogRate: 60,
  taskCompletion: Math.round((mockTasks.filter(t => t.status === "completed").length / mockTasks.length) * 100),
};

const nudges = [
  metrics.deepWork < 40 && {
    icon: Zap,
    color: "amber",
    msg: `Deep work at ${metrics.deepWork}% — below the 40% target. Block 2hr Thursday morning to recover.`,
  },
  metrics.meetingLoad > 12 && {
    icon: AlertTriangle,
    color: "rose",
    msg: `${metrics.meetingLoad.toFixed(1)}hr in meetings this week. Consider making at least 1 async.`,
  },
  metrics.frogRate < 70 && {
    icon: TrendingUp,
    color: "violet",
    msg: `Frog Rate: ${metrics.frogRate}%. Try doing your hardest task first for 5 consecutive days.`,
  },
].filter(Boolean);

export default function Insights() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const quote = leaderQuotes[quoteIdx];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Leader quote carousel */}
      <div className="rounded-xl bg-gradient-to-r from-teal-900/40 to-violet-900/40 border border-teal-500/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setQuoteIdx((q) => (q - 1 + leaderQuotes.length) % leaderQuotes.length)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base text-white font-medium italic">"{quote.quote}"</p>
            <p className="text-sm text-teal-300 mt-2">— {quote.author}</p>
            <span className="text-xs text-teal-400/70 bg-indigo-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
              {quote.framework}
            </span>
          </div>
          <button
            onClick={() => setQuoteIdx((q) => (q + 1) % leaderQuotes.length)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Metric rings */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-4">This Week's Productivity Scorecard</h3>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={metrics.deepWork}
              max={100}
              color={metrics.deepWork >= 40 ? "#10b981" : "#f59e0b"}
              label="Deep Work"
              sublabel="target >40%"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={metrics.mitCompletion}
              max={100}
              color={metrics.mitCompletion >= 80 ? "#10b981" : "#f59e0b"}
              label="MIT Done"
              sublabel="target >80%"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={metrics.frogRate}
              max={100}
              color={metrics.frogRate >= 70 ? "#10b981" : "#8b5cf6"}
              label="Frog Rate"
              sublabel="eat it first"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-2">
            <MetricRing
              value={metrics.taskCompletion}
              max={100}
              color="#0d9488"
              label="Tasks Done"
              sublabel="this week"
            />
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className="text-3xl font-bold text-emerald-400">{metrics.focusStreak}</div>
            <p className="text-xs font-medium text-stone-300 text-center">Focus Streak</p>
            <p className="text-xs text-stone-500 text-center">consecutive days</p>
          </div>
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4 flex flex-col items-center gap-3">
            <div className={`text-3xl font-bold ${meetHrs > 12 ? "text-rose-400" : "text-stone-300"}`}>
              {meetHrs.toFixed(1)}h
            </div>
            <p className="text-xs font-medium text-stone-300 text-center">Meetings</p>
            <p className="text-xs text-stone-500 text-center">target &lt;12hr/wk</p>
          </div>
        </div>
      </div>

      {/* Weekly breakdown bar chart */}
      <div className="rounded-xl bg-stone-800 border border-stone-700 p-5">
        <h3 className="text-sm font-semibold text-stone-300 mb-4">Daily Focus vs Meeting Load</h3>
        <div className="flex items-end gap-3 h-28">
          {weekEvents.map((day) => {
            const total = day.focusHours + day.meetingHours;
            const focusPct = (day.focusHours / (total || 1)) * 100;
            const meetPct = (day.meetingHours / (total || 1)) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-20 gap-0.5">
                  <div
                    className="w-full bg-teal-500/60 rounded-t"
                    style={{ height: `${meetPct * 0.8}%` }}
                    title={`${day.meetingHours}hr meetings`}
                  />
                  <div
                    className="w-full bg-emerald-500/70 rounded-t"
                    style={{ height: `${focusPct * 0.8}%` }}
                    title={`${day.focusHours}hr focus`}
                  />
                </div>
                <span className="text-xs text-stone-500">{day.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" /> Focus
          </span>
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/60" /> Meetings
          </span>
        </div>
      </div>

      {/* Sage nudges */}
      {nudges.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-300">Sage Recommendations</h3>
          {nudges.map(({ icon: Icon, color, msg }, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                color === "amber" ? "border-amber-500/30 bg-amber-500/5 text-amber-300" :
                color === "rose" ? "border-rose-500/30 bg-rose-500/5 text-rose-300" :
                "border-violet-500/30 bg-violet-500/5 text-violet-300"
              }`}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <p className="text-sm">{msg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
