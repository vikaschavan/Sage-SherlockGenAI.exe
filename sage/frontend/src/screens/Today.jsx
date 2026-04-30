import { useState } from "react";
import { AlertCircle, Lock, Plus, Star, ShieldAlert, TrendingUp, CheckCircle2, X } from "lucide-react";
import TaskCard from "../components/TaskCard";
import EventCard from "../components/EventCard";
import SagePanel from "../components/SagePanel";
import { todayEvents } from "../data/mockEvents";
import { planWeek } from "../api/sage";

function findMeetingByTitle(title) {
  return todayEvents.find((event) => event.type === "meeting" && event.title === title) || null;
}

export default function Today({
  activeMeeting,
  setActiveMeeting,
  setActiveScreen,
  tasks = [],
  onToggleTask,
  setTaskDraft,
  meetingNoteDraft,
  setMeetingNoteDraft,
  workflowNotice,
  setWorkflowNotice,
}) {
  const [capture, setCapture] = useState("");
  const [captureMode, setCaptureMode] = useState(false);

  const meetings = todayEvents.filter((event) => event.type === "meeting");
  const meetingLoad = meetings.reduce((sum, event) => sum + event.duration_min / 60, 0);
  const focusHours = todayEvents
    .filter((event) => event.type === "focus")
    .reduce((sum, event) => sum + event.duration_min / 60, 0);
  const todayMITs = tasks.filter((task) => task.isMIT || task.isFrog);
  const overdueTasks = tasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10));
  const apexMeeting = findMeetingByTitle("Apex Client Call");
  const productReviewMeeting = findMeetingByTitle("Product Review");

  const executiveSignals = [
    {
      icon: ShieldAlert,
      title: "Risky meeting",
      detail: "Apex Client Call needs a clear renewal path and a decision on follow-up ownership.",
    },
    {
      icon: TrendingUp,
      title: "Decision bottleneck",
      detail: "Product Review still carries launch-risk until the auth refactor review is closed.",
    },
    {
      icon: AlertCircle,
      title: "Delegation candidate",
      detail: "Weekly Status Standup should move async and return an hour of executive time.",
    },
  ];

  const proactive = [
    `**Chief of staff brief:** ${meetings.length} meetings, ${meetingLoad.toFixed(1)} hours of coordination, ${focusHours.toFixed(1)} hours of protected focus.`,
    overdueTasks.length > 0
      ? `**Commitments at risk:** ${overdueTasks.length} overdue tasks need owner attention before the next meeting cycle.`
      : "**Commitments at risk:** no overdue task is currently blocking the day.",
    activeMeeting?.title
      ? `**Open meeting context:** ${activeMeeting.title} is the active workspace. Ask Sage for the decision, risk, or follow-up path.`
      : "**Open meeting context:** no meeting selected yet. Open a meeting brief or debrief to bind chat to a specific conversation.",
  ];

  function openMeetingWorkflow(screen, meeting) {
    if (meeting) {
      setActiveMeeting?.(meeting);
    }
    setActiveScreen?.(screen);
  }

  function openTaskCapture(priority = "medium", prefix = "") {
    const title = `${prefix}${capture.trim()}`.trim();
    if (!title) {
      return;
    }
    setTaskDraft?.({
      title,
      priority,
      project: activeMeeting?.title || "",
      notice: "Review the captured item, add detail if needed, then save it into the task system.",
    });
    setCapture("");
    setCaptureMode(false);
    setActiveScreen?.("tasks");
  }

  function routeToMeetingNotes() {
    const note = capture.trim();
    if (!note || !activeMeeting) {
      return;
    }
    setMeetingNoteDraft?.({
      text: note,
      meetingId: activeMeeting.id,
    });
    setCapture("");
    setCaptureMode(false);
    openMeetingWorkflow("debrief", activeMeeting);
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-72 shrink-0 border-r border-stone-700 p-4 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Today's Schedule</h3>
          <span className="text-xs text-stone-500">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 flex items-center gap-2">
          <Lock size={12} className="text-cyan-300 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-cyan-200">Protected: 7:00-8:30 AM</p>
            <p className="text-xs text-cyan-300/70">Strategic focus. No meetings should displace this slot.</p>
          </div>
        </div>

        {todayEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

        <div className="mt-4 rounded-xl bg-stone-800 border border-stone-700 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Meeting load</span>
            <span className={meetingLoad > 4 ? "text-amber-400 font-semibold" : "text-stone-300"}>
              {meetingLoad.toFixed(1)}h
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Deep work</span>
            <span className={focusHours >= 2 ? "text-emerald-400 font-semibold" : "text-amber-400"}>
              {focusHours.toFixed(1)}h
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Open commitments</span>
            <span className={overdueTasks.length > 0 ? "text-rose-400 font-semibold" : "text-stone-300"}>
              {overdueTasks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {workflowNotice?.type === "today_focus_updated" && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">Today's focus was updated</p>
                  <p className="text-sm text-stone-300 mt-1">
                    The top execution queue from `Tasks` is now driving this screen.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(workflowNotice.tasks || []).map((taskTitle) => (
                      <span
                        key={taskTitle}
                        className="text-xs px-2 py-1 rounded-full bg-stone-900 border border-stone-700 text-stone-200"
                      >
                        {taskTitle}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWorkflowNotice?.(null)}
                className="text-stone-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {executiveSignals.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="rounded-xl bg-stone-800 border border-stone-700 p-4">
              <div className="flex items-center gap-2 text-cyan-300">
                <Icon size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
              </div>
              <p className="text-sm text-stone-300 mt-3">{detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Executive operating cadence</p>
              <p className="text-sm text-stone-500 mt-1">
                Tighten focus, prep the key meeting, then close the loop after decisions land.
              </p>
            </div>
            <button
              onClick={() => setActiveScreen?.("tasks")}
              className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              Refine priorities
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              {
                title: "1. Lock today's focus",
                detail: todayMITs.length
                  ? `${todayMITs.length} focus task${todayMITs.length === 1 ? "" : "s"} are ready for execution.`
                  : "Promote the top three from Tasks before stepping into meetings.",
                actionLabel: "Open Tasks",
                action: () => setActiveScreen?.("tasks"),
              },
              {
                title: "2. Prep the client call",
                detail: "Use the meeting brief to align on decision points, risk, and follow-up ownership.",
                actionLabel: "Open Apex brief",
                action: () => openMeetingWorkflow("brief", apexMeeting),
              },
              {
                title: "3. Close the loop",
                detail: "Turn discussion notes into owners, due dates, and a follow-up draft immediately after the meeting.",
                actionLabel: "Open Product debrief",
                action: () => openMeetingWorkflow("debrief", productReviewMeeting),
              },
            ].map((step) => (
              <div key={step.title} className="rounded-lg bg-stone-900/70 border border-stone-700 px-4 py-4">
                <p className="text-xs font-semibold text-cyan-200">{step.title}</p>
                <p className="text-sm text-stone-400 mt-2 min-h-12">{step.detail}</p>
                <button
                  onClick={step.action}
                  className="mt-4 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
                >
                  {step.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-stone-200">Most Important Tasks Today</h2>
          </div>
          <div className="space-y-2">
            {todayMITs.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={onToggleTask} />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-3 flex gap-2">
          <input
            value={capture}
            onChange={(event) => setCapture(event.target.value)}
            placeholder="Capture a risk, task, or follow-up..."
            className="flex-1 bg-transparent text-sm text-white placeholder-stone-500 focus:outline-none"
          />
          <button
            onClick={() => setCaptureMode(Boolean(capture.trim()))}
            className="w-8 h-8 rounded-lg bg-stone-700 hover:bg-cyan-600 flex items-center justify-center transition-colors"
          >
            <Plus size={14} className="text-white" />
          </button>
        </div>
        {captureMode && capture.trim() && (
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Route this capture</p>
            <p className="text-sm text-stone-300 mt-2">
              `Today` should capture fast. Choose where this belongs before you move on.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-stone-900/70 border border-stone-700 px-4 py-4">
                <p className="text-xs font-semibold text-cyan-200">Create task</p>
                <p className="text-sm text-stone-400 mt-2">Send this into the execution system for full tracking and prioritization.</p>
                <button
                  onClick={() => openTaskCapture("medium")}
                  className="mt-4 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
                >
                  Open in Tasks
                </button>
              </div>
              <div className="rounded-lg bg-stone-900/70 border border-stone-700 px-4 py-4">
                <p className="text-xs font-semibold text-cyan-200">Attach to meeting</p>
                <p className="text-sm text-stone-400 mt-2">Add it to the active meeting notes so the debrief picks it up with the rest of the conversation.</p>
                <button
                  onClick={routeToMeetingNotes}
                  disabled={!activeMeeting}
                  className="mt-4 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
                >
                  {activeMeeting ? "Open debrief" : "Select a meeting first"}
                </button>
              </div>
              <div className="rounded-lg bg-stone-900/70 border border-stone-700 px-4 py-4">
                <p className="text-xs font-semibold text-cyan-200">Flag as risk</p>
                <p className="text-sm text-stone-400 mt-2">Escalate it into the task system as a high-priority item that should show up in execution planning.</p>
                <button
                  onClick={() => openTaskCapture("high", "Risk: ")}
                  className="mt-4 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
                >
                  Send as high priority
                </button>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-stone-600 -mt-4 ml-1">
          Capture first, then route it into the right meeting or task workflow.
        </p>

        <div>
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">All Tasks</h3>
          <div className="space-y-2">
            {tasks.filter((task) => !task.isMIT && !task.isFrog).map((task) => (
              <TaskCard key={task.id} task={task} compact onToggle={onToggleTask} />
            ))}
          </div>
        </div>
      </div>

      <SagePanel
        title="Sage - Morning Brief"
        contextLabel={activeMeeting ? `Active meeting: ${activeMeeting.title}` : "No meeting workspace selected"}
        proactive={proactive}
        onAsk={(message) => planWeek(message, "today-session")}
      />
    </div>
  );
}
