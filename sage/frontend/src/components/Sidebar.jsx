import {
  Sun,
  CalendarDays,
  Zap,
  FileText,
  BarChart2,
  CheckSquare,
  ExternalLink,
} from "lucide-react";
import sageMark from "../assets/sage-mark.svg";

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
      <img src={sageMark} alt="Sage" className="w-10 h-10 mb-4 drop-shadow-sm" />

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

      <a
        href="https://www.linkedin.com/in/mevikaschavan/"
        target="_blank"
        rel="noopener noreferrer"
        title="Built by Vikas Chavan"
        className="mt-auto group relative w-10 h-10 rounded-xl border border-[rgba(251,247,240,0.16)] bg-[rgba(251,247,240,0.08)] text-white flex items-center justify-center hover:bg-[rgba(251,247,240,0.14)] transition-colors"
      >
        <span className="text-[11px] font-semibold tracking-[0.18em]">VC</span>
        <ExternalLink size={10} className="absolute right-1.5 bottom-1.5 text-[rgba(248,243,234,0.7)]" />
        <span className="sage-sidebar-tooltip absolute left-14 text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
          Built by Vikas Chavan
        </span>
      </a>
    </div>
  );
}
