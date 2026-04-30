import { Users, AlertTriangle, ArrowRightLeft, Lock } from "lucide-react";

const typeStyles = {
  focus: "border-[color:rgba(47,125,101,0.22)] bg-[var(--sage-emerald-soft)] text-[var(--sage-emerald)]",
  break: "border-[var(--sage-border)] bg-[var(--sage-surface-muted)] text-[var(--sage-muted)]",
  meeting: "border-[color:rgba(15,118,110,0.2)] bg-[var(--sage-accent-soft)] text-[var(--sage-text)]",
};

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function EventCard({ event, protected: isProtected }) {
  const isLong = event.duration_min > 60;
  const isAsync = event.isAsync;
  const style = typeStyles[event.type] || typeStyles.meeting;

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${style}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isProtected && <Lock size={11} className="text-[var(--sage-accent)] shrink-0" />}
          <span className="font-medium truncate">{event.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isLong && (
            <span
              title="Musk standard: try 25 or 50 min"
              className="flex items-center gap-0.5 text-[var(--sage-amber)] text-xs"
            >
              <AlertTriangle size={11} /> {event.duration_min}m
            </span>
          )}
          {isAsync && (
            <span
              title="This could be async - consider an email or doc"
              className="flex items-center gap-0.5 text-[var(--sage-accent)] text-xs"
            >
              <ArrowRightLeft size={11} /> Async?
            </span>
          )}
          {!isLong && !isAsync && event.duration_min && (
            <span className="text-xs text-[var(--sage-muted)]">{event.duration_min}m</span>
          )}
        </div>
      </div>
      {(event.start || event.end) && (
        <div className="text-xs text-[var(--sage-muted)] mt-0.5">
          {formatTime(event.start)}
          {event.end ? ` -> ${formatTime(event.end)}` : ""}
        </div>
      )}
      {event.attendees?.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-xs text-[var(--sage-muted)]">
          <Users size={10} />
          {event.attendees.slice(0, 3).join(", ")}
          {event.attendees.length > 3 && ` +${event.attendees.length - 3}`}
        </div>
      )}
    </div>
  );
}
