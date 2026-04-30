import {
  Sun,
  CalendarDays,
  Zap,
  FileText,
  BarChart2,
  CheckSquare,
  Sparkles,
} from "lucide-react";

const nav = [
  { id: "today", icon: Sun, label: "Today" },
  { id: "week", icon: CalendarDays, label: "Week Planner" },
  { id: "brief", icon: FileText, label: "Meeting Brief" },
  { id: "debrief", icon: Zap, label: "Debrief" },
  { id: "insights", icon: BarChart2, label: "Insights" },
  { id: "tasks", icon: CheckSquare, label: "Tasks" },
];

export default function Sidebar({ active, onNav }) {
  return (
    <div className="sage-sidebar w-16 flex flex-col items-center border-r py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-[var(--sage-accent)] flex items-center justify-center mb-4 shadow-sm">
        <Sparkles size={18} className="text-white" />
      </div>

      {nav.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => onNav(id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative
            ${active === id
              ? "bg-[rgba(251,247,240,0.16)] text-white border border-[rgba(251,247,240,0.18)]"
              : "text-[rgba(248,243,234,0.58)] hover:bg-[rgba(251,247,240,0.08)] hover:text-white"
            }`}
        >
          <Icon size={18} />
          {/* Tooltip */}
          <span className="sage-sidebar-tooltip absolute left-14 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
