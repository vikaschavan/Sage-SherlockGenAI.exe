import { Star, Flame, Clock, CheckCircle2, Circle } from "lucide-react";

const priorityColors = {
  high: "text-[var(--sage-rose)] bg-[var(--sage-rose-soft)] border-[color:rgba(180,83,74,0.2)]",
  medium: "text-[var(--sage-amber)] bg-[var(--sage-amber-soft)] border-[color:rgba(161,98,7,0.2)]",
  low: "text-[var(--sage-emerald)] bg-[var(--sage-emerald-soft)] border-[color:rgba(47,125,101,0.2)]",
};

export default function TaskCard({ task, compact = false, onToggle }) {
  const done = task.status === "completed";

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        done ? "opacity-50" : ""
      } ${
        task.isFrog
          ? "border-[color:rgba(180,83,74,0.24)] bg-[var(--sage-rose-soft)]"
          : task.isMIT
            ? "border-[color:rgba(15,118,110,0.24)] bg-[var(--sage-accent-soft)]"
            : "border-[var(--sage-border)] bg-[rgba(251,247,240,0.82)]"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggle && onToggle(task.id)}
          className="mt-0.5 shrink-0 text-[var(--sage-soft)] hover:text-[var(--sage-emerald)] transition-colors"
        >
          {done ? (
            <CheckCircle2 size={16} className="text-[var(--sage-emerald)]" />
          ) : (
            <Circle size={16} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.isFrog && (
              <span
                title="Eat the Frog - do this first"
                className="flex items-center gap-0.5 text-[var(--sage-rose)] text-xs font-semibold"
              >
                <Flame size={11} /> Frog
              </span>
            )}
            {task.isMIT && !task.isFrog && (
              <span
                title="Most Important Task"
                className="flex items-center gap-0.5 text-[var(--sage-accent)] text-xs font-semibold"
              >
                <Star size={11} /> MIT
              </span>
            )}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                priorityColors[task.priority] || priorityColors.low
              }`}
            >
              {task.priority}
            </span>
            {task.project && (
              <span className="text-xs text-[var(--sage-muted)] bg-[var(--sage-surface-muted)] px-1.5 py-0.5 rounded-full border border-[var(--sage-border)]">
                {task.project}
              </span>
            )}
          </div>
          <p
            className={`text-sm font-medium mt-1 ${
              done ? "line-through text-[var(--sage-soft)]" : "text-[var(--sage-text)]"
            }`}
          >
            {task.title}
          </p>
          {!compact && task.description && (
            <p className="text-xs text-[var(--sage-muted)] mt-0.5 line-clamp-2">{task.description}</p>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[var(--sage-muted)]">
              <Clock size={10} />
              Due {task.due_date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
