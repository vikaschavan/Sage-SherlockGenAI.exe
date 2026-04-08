import { Star, Flame, Clock, CheckCircle2, Circle } from "lucide-react";

const priorityColors = {
  high: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

export default function TaskCard({ task, compact = false, onToggle }) {
  const done = task.status === "completed";

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        done ? "opacity-50" : ""
      } ${
        task.isFrog
          ? "border-rose-500/40 bg-rose-500/5"
          : task.isMIT
          ? "border-indigo-500/40 bg-indigo-500/5"
          : "border-stone-700 bg-stone-800/60"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggle && onToggle(task.id)}
          className="mt-0.5 shrink-0 text-stone-400 hover:text-emerald-400 transition-colors"
        >
          {done ? (
            <CheckCircle2 size={16} className="text-emerald-400" />
          ) : (
            <Circle size={16} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.isFrog && (
              <span title="Eat the Frog — do this first!" className="flex items-center gap-0.5 text-rose-400 text-xs font-semibold">
                <Flame size={11} /> Frog
              </span>
            )}
            {task.isMIT && !task.isFrog && (
              <span title="Most Important Task" className="flex items-center gap-0.5 text-indigo-400 text-xs font-semibold">
                <Star size={11} /> MIT
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${priorityColors[task.priority] || priorityColors.low}`}>
              {task.priority}
            </span>
            {task.project && (
              <span className="text-xs text-stone-500 bg-stone-700/50 px-1.5 py-0.5 rounded-full">
                {task.project}
              </span>
            )}
          </div>
          <p className={`text-sm font-medium mt-1 ${done ? "line-through text-stone-500" : "text-stone-100"}`}>
            {task.title}
          </p>
          {!compact && task.description && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-stone-500">
              <Clock size={10} />
              Due {task.due_date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
