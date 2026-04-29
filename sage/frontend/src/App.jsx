import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Today from "./screens/Today";
import WeekPlanner from "./screens/WeekPlanner";
import MeetingBrief from "./screens/MeetingBrief";
import Debrief from "./screens/Debrief";
import Insights from "./screens/Insights";
import Tasks from "./screens/Tasks";
import { getBackendHealth } from "./api/sage";

const screenTitles = {
  today: "Today",
  week: "Week Planner",
  brief: "Meeting Brief",
  debrief: "Post-Meeting Debrief",
  insights: "Insights",
  tasks: "Tasks",
};

const screens = {
  today: Today,
  week: WeekPlanner,
  brief: MeetingBrief,
  debrief: Debrief,
  insights: Insights,
  tasks: Tasks,
};

export default function App() {
  const [active, setActive] = useState("today");
  const [backendStatus, setBackendStatus] = useState("checking");
  const Screen = screens[active] || Today;

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        await getBackendHealth();
        if (!cancelled) {
          setBackendStatus("live");
        }
      } catch {
        if (!cancelled) {
          setBackendStatus("offline");
        }
      }
    }

    checkBackend();
    const intervalId = window.setInterval(checkBackend, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const backendBadge = {
    checking: "text-amber-300 bg-amber-500/10 border border-amber-500/20",
    live: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
    offline: "text-rose-300 bg-rose-500/10 border border-rose-500/20",
  }[backendStatus];

  const backendLabel = {
    checking: "Backend warming",
    live: "Backend live",
    offline: "Backend offline",
  }[backendStatus];

  return (
    <div className="flex h-screen bg-stone-950 text-white overflow-hidden">
      <Sidebar active={active} onNav={setActive} />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="h-12 shrink-0 border-b border-stone-700 flex items-center px-5 gap-3">
          <h1 className="text-sm font-semibold text-stone-200">{screenTitles[active]}</h1>
          <span className="text-stone-600">·</span>
          <span className="text-xs text-stone-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${backendBadge}`}>
              {backendLabel}
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Gemini 2.5 Flash
            </span>
            <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              ADK Multi-Agent
            </span>
          </div>
        </div>

        {/* Screen */}
        <div className="flex flex-1 min-h-0">
          <Screen />
        </div>
      </div>
    </div>
  );
}
