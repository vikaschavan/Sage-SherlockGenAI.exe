import { useEffect, useState } from "react";
import { CheckSquare, Loader2, Sparkles } from "lucide-react";
import TaskCard from "../components/TaskCard";
import { mockTasks } from "../data/mockTasks";
import { createTask, planWeek } from "../api/sage";

const filters = ["all", "high", "medium", "low", "overdue"];

export default function Tasks({
  tasks = mockTasks,
  setTasks,
  onToggleTask,
  setActiveScreen,
  setWorkflowNotice,
  taskDraft,
  setTaskDraft,
}) {
  const [filter, setFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [queuePromoted, setQueuePromoted] = useState(false);
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPriority, setDraftPriority] = useState("medium");
  const [draftProject, setDraftProject] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskNotice, setTaskNotice] = useState("");

  const projects = [...new Set(tasks.map((task) => task.project).filter(Boolean))];

  const today = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter((t) => {
    if (filter === "high" && t.priority !== "high") return false;
    if (filter === "medium" && t.priority !== "medium") return false;
    if (filter === "low" && t.priority !== "low") return false;
    if (filter === "overdue" && (!t.due_date || t.due_date >= today)) return false;
    if (projectFilter !== "all" && t.project !== projectFilter) return false;
    return true;
  });

  useEffect(() => {
    if (!taskDraft) {
      return;
    }

    setComposerOpen(true);
    setDraftTitle(taskDraft.title || "");
    setDraftDescription(taskDraft.description || "");
    setDraftPriority(taskDraft.priority || "medium");
    setDraftProject(taskDraft.project || "");
    setDraftDueDate(taskDraft.due_date || "");
    setTaskNotice(taskDraft.notice || "");
  }, [taskDraft?.title, taskDraft?.priority, taskDraft?.project, taskDraft?.due_date]);

  const executionQueue = [...tasks]
    .filter((task) => task.status !== "completed")
    .sort((left, right) => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return (left.due_date || "9999-99-99").localeCompare(right.due_date || "9999-99-99");
    })
    .slice(0, 3);

  async function handleAIPrioritize() {
    setAiLoading(true);
    setAiNote("");
    setQueuePromoted(false);
    setWorkflowStep("idle");
    try {
      const taskList = tasks
        .filter((t) => t.status !== "completed")
        .map((t) => `- ${t.title} (${t.priority}, due ${t.due_date || "N/A"})`)
        .join("\n");
      const result = await planWeek(
        `Prioritize these tasks for me and explain the order:\n${taskList}`,
        "task-session"
      );
      setAiNote(result?.reply || "No response");
    } catch {
      setAiNote("Sage could not reprioritize live right now. The existing task order is still available for demo and review.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreateTask() {
    if (!draftTitle.trim()) {
      return;
    }

    setCreatingTask(true);
    setTaskNotice("");
    try {
      const created = await createTask({
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        priority: draftPriority,
        due_date: draftDueDate ? `${draftDueDate}T17:00:00` : null,
        project: draftProject.trim() || null,
        assignee: "me",
      });
      const normalized = {
        ...created,
        id: String(created.id),
        status: created.status === "done" ? "completed" : created.status === "todo" ? "pending" : created.status,
        due_date: created.due_date ? created.due_date.slice(0, 10) : "",
        isMIT: false,
        isFrog: false,
      };
      setTasks((previous) => [normalized, ...previous]);
      setTaskNotice("Task created. It is now in the execution system.");
      setComposerOpen(false);
      setDraftTitle("");
      setDraftDescription("");
      setDraftPriority("medium");
      setDraftProject("");
      setDraftDueDate("");
      setTaskDraft?.(null);
    } catch {
      setTaskNotice("Task creation failed. The backend is live, but this item was not persisted.");
    } finally {
      setCreatingTask(false);
    }
  }

  function openComposerWithBlank() {
    setComposerOpen(true);
    setTaskNotice("");
    if (!taskDraft) {
      setDraftTitle("");
      setDraftDescription("");
      setDraftPriority("medium");
      setDraftProject("");
      setDraftDueDate("");
    }
  }

  function promoteExecutionQueue() {
    if (queuePromoted) {
      setActiveScreen?.("today");
      return;
    }

    const queueIds = new Set(executionQueue.map((task) => task.id));
    setTasks((previous) =>
      previous.map((task) => ({
        ...task,
        isMIT: queueIds.has(task.id),
      })),
    );
    setQueuePromoted(true);
    setWorkflowStep("promoted");
    setWorkflowNotice?.({
      type: "today_focus_updated",
      tasks: executionQueue.map((task) => task.title),
      created_at: Date.now(),
    });
    setActiveScreen?.("today");
  }

  function reviewHighPriority() {
    setFilter("high");
    setProjectFilter("all");
    setQueuePromoted(false);
    setWorkflowStep("review");
  }

  const counts = {
    all: tasks.length,
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
    overdue: tasks.filter((t) => t.due_date && t.due_date < today).length,
  };

  const workflowCards = [
    {
      title: "1. Review high priority",
      detail: "Narrow the list to what deserves executive attention first.",
      active: workflowStep === "review" || filter === "high",
      actionLabel: "Review now",
      action: reviewHighPriority,
    },
    {
      title: "2. Commit top 3",
      detail: "Move the next three actions into today's working focus.",
      active: workflowStep === "promoted" || queuePromoted,
      actionLabel: queuePromoted ? "Open Today" : "Make top 3 today's focus",
      action: promoteExecutionQueue,
    },
    {
      title: "3. Execute on Today",
      detail: "Land on the executive dashboard with the updated focus queue visible.",
      active: queuePromoted,
      actionLabel: "Go to Today",
      action: () => setActiveScreen?.("today"),
    },
  ];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r border-stone-700 p-4 space-y-4 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Priority</p>
          <div className="space-y-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                  filter === f
                    ? "bg-teal-600/20 text-teal-300"
                    : "text-stone-400 hover:bg-stone-800"
                }`}
              >
                <span className="capitalize">{f}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  f === "high" ? "bg-rose-500/20 text-rose-400" :
                  f === "medium" ? "bg-amber-500/20 text-amber-400" :
                  f === "low" ? "bg-emerald-500/20 text-emerald-400" :
                  f === "overdue" ? "bg-red-500/20 text-red-400" :
                  "bg-stone-700 text-stone-400"
                }`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Project</p>
          <div className="space-y-1">
            <button
              onClick={() => setProjectFilter("all")}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                projectFilter === "all" ? "bg-teal-600/20 text-teal-300" : "text-stone-400 hover:bg-stone-800"
              }`}
            >
              All Projects
            </button>
            {projects.map((p) => (
              <button
                key={p}
                onClick={() => setProjectFilter(p)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  projectFilter === p ? "bg-teal-600/20 text-teal-300" : "text-stone-400 hover:bg-stone-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare size={18} className="text-indigo-400" />
              Tasks
            </h2>
            <p className="text-sm text-stone-400">{filtered.length} task{filtered.length !== 1 ? "s" : ""} shown</p>
          </div>
          <button
            onClick={handleAIPrioritize}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {aiLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Ask Sage to Prioritize
          </button>
        </div>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Task intake</p>
              <p className="text-sm text-stone-500 mt-1">
                `Today` captures work quickly. `Tasks` is where that captured work becomes a real tracked item.
              </p>
            </div>
            <button
              onClick={openComposerWithBlank}
              className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              New task
            </button>
          </div>
          {composerOpen && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Task title"
                className="col-span-2 rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-200 px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Optional context"
                className="col-span-2 min-h-20 rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-200 px-3 py-2 focus:outline-none focus:border-cyan-500 resize-none"
              />
              <select
                value={draftPriority}
                onChange={(event) => setDraftPriority(event.target.value)}
                className="rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-200 px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
              <input
                value={draftProject}
                onChange={(event) => setDraftProject(event.target.value)}
                placeholder="Project"
                className="rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-200 px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                value={draftDueDate}
                onChange={(event) => setDraftDueDate(event.target.value)}
                className="rounded-lg bg-stone-900 border border-stone-700 text-sm text-stone-200 px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <div className="col-span-2 flex gap-2">
                <button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !draftTitle.trim()}
                  className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                >
                  {creatingTask ? "Creating..." : "Create task"}
                </button>
                <button
                  onClick={() => {
                    setComposerOpen(false);
                    setTaskDraft?.(null);
                    setTaskNotice("");
                  }}
                  className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {taskNotice && (
            <p className="mt-3 text-xs text-cyan-300">{taskNotice}</p>
          )}
        </div>

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Executive workflow</p>
              <p className="text-sm text-stone-500 mt-1">
                Tighten the task list, commit the top three, then move straight back into the operating view.
              </p>
            </div>
            <button
              onClick={reviewHighPriority}
              className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              Review high priority
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {workflowCards.map((item) => (
              <div
                key={item.title}
                className={`rounded-lg border px-3 py-3 ${
                  item.active
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : "border-stone-700 bg-stone-900/70"
                }`}
              >
                <p className={`text-xs font-semibold ${item.active ? "text-cyan-200" : "text-stone-300"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-stone-500 mt-2 min-h-10">{item.detail}</p>
                <button
                  onClick={item.action}
                  className={`mt-3 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    item.active
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                      : "bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200"
                  }`}
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>

        {aiNote && (
          <div className="rounded-xl bg-violet-900/20 border border-violet-500/20 p-4">
            <p className="text-xs font-semibold text-violet-300 mb-2 flex items-center gap-1">
              <Sparkles size={11} /> Sage Prioritization
            </p>
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{aiNote}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {workflowCards.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-lg border px-3 py-3 ${
                    item.active
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-stone-700 bg-stone-900/70"
                  }`}
                >
                  <p className={`text-xs font-semibold ${item.active ? "text-violet-200" : "text-stone-400"}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-stone-500 mt-2">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={promoteExecutionQueue}
                className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
              >
                {queuePromoted ? "Open Today focus" : "Make top 3 today's focus"}
              </button>
              <button
                onClick={reviewHighPriority}
                className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                Review high priority
              </button>
            </div>
          </div>
        )}

        {(filter === "high" || workflowStep === "review") && (
          <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">High Priority Review</p>
                <p className="text-sm text-stone-500 mt-1">
                  These are the tasks worth executive attention before anything medium or low priority.
                </p>
              </div>
              <button
                onClick={() => setFilter("all")}
                className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                Show all
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Execution Queue</p>
              <p className="text-sm text-stone-500 mt-1">
                What the next working block should absorb.
                {queuePromoted ? " This queue is now mirrored in Today." : ""}
              </p>
            </div>
            <button
              onClick={promoteExecutionQueue}
              className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              {queuePromoted ? "Open Today" : "Push to Today"}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {executionQueue.map((task, index) => (
              <div key={task.id} className="rounded-lg bg-stone-900/70 border border-stone-700 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-violet-300 font-semibold">#{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200">{task.title}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {task.priority} priority
                      {task.due_date ? ` | due ${task.due_date}` : ""}
                      {task.project ? ` | ${task.project}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-stone-600 py-16">
              <CheckSquare size={32} className="mx-auto mb-2" />
              <p>No tasks match this filter</p>
            </div>
          )}
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </div>
      </div>
    </div>
  );
}
