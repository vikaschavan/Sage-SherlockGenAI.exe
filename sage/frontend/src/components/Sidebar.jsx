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
    <div className="w-16 flex flex-col items-center bg-stone-900 border-r border-stone-700 py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center mb-4">
        <Sparkles size={18} className="text-white" />
      </div>

      {nav.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => onNav(id)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative
            ${active === id
              ? "bg-teal-600 text-white"
              : "text-stone-400 hover:bg-stone-800 hover:text-white"
            }`}
        >
          <Icon size={18} />
          {/* Tooltip */}
          <span className="absolute left-14 bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-stone-600">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
