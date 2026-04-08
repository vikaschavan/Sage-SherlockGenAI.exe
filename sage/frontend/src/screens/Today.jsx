import { useState } from "react";
import { Lock, Plus, Flame, Star, Clock, Info } from "lucide-react";
import TaskCard from "../components/TaskCard";
import EventCard from "../components/EventCard";
import SagePanel from "../components/SagePanel";
import { mockTasks } from "../data/mockTasks";
import { todayEvents } from "../data/mockEvents";
import { planWeek } from "../api/sage";

const mitTasks = mockTasks.filter((t) => t.isMIT || t.isFrog).slice(0, 3);

export default function Today() {
  const [tasks, setTasks] = useState(mockTasks);
  const [capture, setCapture] = useState("");

  const meetingLoad = todayEvents
    .filter((e) => e.type === "meeting")
    .reduce((s, e) => s + e.duration_min / 60, 0);

  const focusHours = todayEvents
    .filter((e) => e.type === "focus")
    .reduce((s, e) => s + e.duration_min / 60, 0);

  const todayMITs = tasks.filter((t) => t.isMIT || t.isFrog);

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t
      )
    );

  const proactive = [
    `**Good morning!** You have **${todayEvents.filter(e => e.type === "meeting").length} meetings** today — ${meetingLoad.toFixed(1)}hr meeting load.`,
    focusHours < 2
      ? "⚠️ You have less than 2hr of deep work blocked. Consider protecting the 11am slot."
      : `✅ ${focusHours}hr focus time blocked — great deep work day ahead.`,
    "The **Weekly Status Standup at 4pm** looks like a status update. Consider making it async and reclaiming that hour.",
  ];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: Time blocks */}
      <div className="w-72 shrink-0 border-r border-stone-700 p-4 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Today's Schedule</h3>
          <span className="text-xs text-stone-500">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Protected morning block */}
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 flex items-center gap-2">
          <Lock size={12} className="text-indigo-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-teal-300">Protected: 7–8:30am</p>
            <p className="text-xs text-teal-400/70">Morning ritual — no meetings</p>
          </div>
          <span
            title="First 90 min = biological peak. Cal Newport: 'Do the cognitively demanding work first.'"
            className="ml-auto cursor-help"
          >
            <Info size={12} className="text-indigo-400/60" />
          </span>
        </div>

        {todayEvents.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}

        {/* Metric summary */}
        <div className="mt-4 rounded-xl bg-stone-800 border border-stone-700 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Meeting load</span>
            <span className={meetingLoad > 4 ? "text-amber-400 font-semibold" : "text-stone-300"}>
              {meetingLoad.toFixed(1)}hr
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Deep work</span>
            <span className={focusHours >= 2 ? "text-emerald-400 font-semibold" : "text-amber-400"}>
              {focusHours}hr
            </span>
          </div>
        </div>
      </div>

      {/* Center: MITs + Capture */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* MIT Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-stone-200">Most Important Tasks Today</h2>
            <span
              title="MIT Method — Tim Ferriss: 'If you do nothing else today, do these.'"
              className="text-stone-500 cursor-help"
            >
              <Info size={12} />
            </span>
          </div>
          <div className="space-y-2">
            {todayMITs.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
        </div>

        {/* Quick capture */}
        <div className="rounded-xl bg-stone-800 border border-stone-700 p-3 flex gap-2">
          <input
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder="Capture a thought, task, or idea..."
            className="flex-1 bg-transparent text-sm text-white placeholder-stone-500 focus:outline-none"
          />
          <button
            onClick={() => setCapture("")}
            className="w-8 h-8 rounded-lg bg-stone-700 hover:bg-teal-600 flex items-center justify-center transition-colors"
          >
            <Plus size={14} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-stone-600 -mt-4 ml-1 flex items-center gap-1">
          <span>GTD Capture — David Allen: capture everything, process later</span>
        </p>

        {/* All today's tasks */}
        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">All Tasks</h3>
          <div className="space-y-2">
            {tasks.filter(t => !t.isMIT && !t.isFrog).map((task) => (
              <TaskCard key={task.id} task={task} compact onToggle={toggleTask} />
            ))}
          </div>
        </div>
      </div>

      {/* Right: Sage AI */}
      <SagePanel
        title="Sage — Morning Brief"
        proactive={proactive}
        onAsk={(msg) => planWeek(msg, "today-session")}
      />
    </div>
  );
}
