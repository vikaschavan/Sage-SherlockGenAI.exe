import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Today from "./screens/Today";
import WeekPlanner from "./screens/WeekPlanner";
import MeetingBrief from "./screens/MeetingBrief";
import Debrief from "./screens/Debrief";
import Insights from "./screens/Insights";
import Tasks from "./screens/Tasks";
import { FRONTEND_DEMO_MODE, getBackendHealth, listTasks, updateTaskStatus } from "./api/sage";
import { todayEvents } from "./data/mockEvents";
import { mockTasks } from "./data/mockTasks";

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

const ACTIVE_MEETING_KEY = "sage.activeMeeting";
const defaultMeeting = todayEvents.find((event) => event.type === "meeting") || null;

function readStoredMeeting() {
  if (typeof window === "undefined") {
    return defaultMeeting;
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_MEETING_KEY);
    if (!raw) {
      return defaultMeeting;
    }
    return JSON.parse(raw);
  } catch {
    return defaultMeeting;
  }
}

function normalizeTaskStatus(status) {
  if (status === "done") {
    return "completed";
  }
  if (status === "todo") {
    return "pending";
  }
  return status || "pending";
}

function decorateTasks(tasks) {
  const activeTasks = [...tasks]
    .filter((task) => task.status !== "completed")
    .sort((left, right) => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityRank[left.priority] ?? 3) - (priorityRank[right.priority] ?? 3);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return (left.due_date || "9999-99-99").localeCompare(right.due_date || "9999-99-99");
    });
  const focusIds = new Set(activeTasks.slice(0, 3).map((task) => String(task.id)));
  const frogId = activeTasks[0] ? String(activeTasks[0].id) : null;

  return tasks.map((task) => ({
    ...task,
    id: String(task.id),
    isMIT: task.isMIT ?? focusIds.has(String(task.id)),
    isFrog: task.isFrog ?? String(task.id) === frogId,
  }));
}

function normalizeTask(task) {
  return {
    ...task,
    id: String(task.id),
    status: normalizeTaskStatus(task.status),
    due_date: task.due_date ? task.due_date.slice(0, 10) : "",
  };
}

function mapFrontendStatusToBackend(status) {
  if (status === "completed") {
    return "done";
  }
  if (status === "pending") {
    return "todo";
  }
  return status || "todo";
}

export default function App() {
  const [active, setActive] = useState("today");
  const [backendInfo, setBackendInfo] = useState({
    status: "checking",
    demo_mode: FRONTEND_DEMO_MODE,
    demo_use_live_enrichment: false,
  });
  const [tasks, setTasks] = useState(() => mockTasks.map((task) => ({ ...task })));
  const [taskDraft, setTaskDraft] = useState(null);
  const [meetingNoteDraft, setMeetingNoteDraft] = useState(null);
  const [workflowNotice, setWorkflowNotice] = useState(null);
  const [activeMeeting, setActiveMeetingState] = useState(readStoredMeeting);
  const Screen = screens[active] || Today;

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        const health = await getBackendHealth();
        if (!cancelled) {
          setBackendInfo({
            status: "live",
            demo_mode: Boolean(health?.demo_mode),
            demo_use_live_enrichment: Boolean(health?.demo_use_live_enrichment),
          });
        }
      } catch {
        if (!cancelled) {
          setBackendInfo((prev) => ({
            ...prev,
            status: "offline",
          }));
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

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      try {
        const result = await listTasks();
        if (cancelled || !Array.isArray(result) || result.length === 0) {
          return;
        }
        setTasks(decorateTasks(result.map(normalizeTask)));
      } catch {
        if (!cancelled) {
          setTasks((current) => decorateTasks(current));
        }
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, []);

  function setActiveMeeting(meeting) {
    setActiveMeetingState(meeting);
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (!meeting) {
        window.localStorage.removeItem(ACTIVE_MEETING_KEY);
      } else {
        window.localStorage.setItem(ACTIVE_MEETING_KEY, JSON.stringify(meeting));
      }
    } catch {
      // Ignore persistence errors and keep in-memory state.
    }
  }

  async function handleToggleTask(taskId) {
    const currentTask = tasks.find((task) => String(task.id) === String(taskId));
    if (!currentTask) {
      return;
    }

    const nextStatus = currentTask.status === "completed" ? "pending" : "completed";
    setTasks((previous) =>
      previous.map((task) =>
        String(task.id) === String(taskId)
          ? { ...task, status: nextStatus }
          : task,
      ),
    );

    try {
      await updateTaskStatus(Number(taskId), mapFrontendStatusToBackend(nextStatus));
    } catch {
      setTasks((previous) =>
        previous.map((task) =>
          String(task.id) === String(taskId)
            ? { ...task, status: currentTask.status }
            : task,
        ),
      );
    }
  }

  const backendBadgeClass = {
    checking: "text-[var(--sage-amber)] bg-[var(--sage-amber-soft)] border border-[color:rgba(161,98,7,0.18)]",
    live: "text-[var(--sage-emerald)] bg-[var(--sage-emerald-soft)] border border-[color:rgba(47,125,101,0.18)]",
    offline: "text-[var(--sage-rose)] bg-[var(--sage-rose-soft)] border border-[color:rgba(180,83,74,0.18)]",
  }[backendInfo.status];

  const backendLabel = {
    checking: "Backend warming",
    live: "Backend live",
    offline: "Backend offline",
  }[backendInfo.status];

  return (
    <div className="flex h-screen overflow-hidden text-[var(--sage-text)]">
      <Sidebar active={active} onNav={setActive} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="sage-topbar h-14 shrink-0 border-b flex items-center px-5 gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--sage-text)]">{screenTitles[active]}</h1>
            <p className="text-[11px] text-[var(--sage-soft)]">Executive operating workspace</p>
          </div>
          <span className="text-[var(--sage-border-strong)]">/</span>
          <span className="text-xs text-[var(--sage-muted)]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${backendBadgeClass}`}>
              {backendLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <Screen
            activeMeeting={activeMeeting}
            setActiveMeeting={setActiveMeeting}
            backendInfo={backendInfo}
            setActiveScreen={setActive}
            tasks={tasks}
            setTasks={setTasks}
            onToggleTask={handleToggleTask}
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            meetingNoteDraft={meetingNoteDraft}
            setMeetingNoteDraft={setMeetingNoteDraft}
            workflowNotice={workflowNotice}
            setWorkflowNotice={setWorkflowNotice}
          />
        </div>
      </div>
    </div>
  );
}
