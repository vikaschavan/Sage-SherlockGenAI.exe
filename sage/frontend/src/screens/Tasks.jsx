import { useState } from "react";
import { CheckSquare, Loader2, Sparkles } from "lucide-react";
import TaskCard from "../components/TaskCard";
import { mockTasks } from "../data/mockTasks";
import { planWeek } from "../api/sage";

const filters = ["all", "high", "medium", "low", "overdue"];
const projects = [...new Set(mockTasks.map((t) => t.project))];

export default function Tasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filter, setFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter((t) => {
    if (filter === "high" && t.priority !== "high") return false;
    if (filter === "medium" && t.priority !== "medium") return false;
    if (filter === "low" && t.priority !== "low") return false;
    if (filter === "overdue" && (!t.due_date || t.due_date >= today)) return false;
    if (projectFilter !== "all" && t.project !== projectFilter) return false;
    return true;
  });

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t
      )
    );

  async function handleAIPrioritize() {
    setAiLoading(true);
    setAiNote("");
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
      setAiNote("Couldn't connect to backend. Make sure the server is running on port 8000.");
    } finally {
      setAiLoading(false);
    }
  }

  const counts = {
    all: tasks.length,
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
    overdue: tasks.filter((t) => t.due_date && t.due_date < today).length,
  };

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

        {aiNote && (
          <div className="rounded-xl bg-violet-900/20 border border-violet-500/20 p-4">
            <p className="text-xs font-semibold text-violet-300 mb-2 flex items-center gap-1">
              <Sparkles size={11} /> Sage Prioritization
            </p>
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{aiNote}</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center text-stone-600 py-16">
              <CheckSquare size={32} className="mx-auto mb-2" />
              <p>No tasks match this filter</p>
            </div>
          )}
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} />
          ))}
        </div>
      </div>
    </div>
  );
}
