import { useState } from "react";
import { Users, ExternalLink, Loader2, FileText, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { todayEvents } from "../data/mockEvents";
import { formatApiError, getMeetingBrief } from "../api/sage";

const meetings = todayEvents.filter((e) => e.type === "meeting");

export default function MeetingBrief() {
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docUrl, setDocUrl] = useState(null);

  async function generate(ev) {
    setSelected(ev);
    setBrief(null);
    setDocUrl(null);
    setError(null);
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await getMeetingBrief(ev.title, today, ev.attendees || []);
      setBrief(result.reply || result.brief || JSON.stringify(result, null, 2));
      if (result.doc_url) setDocUrl(result.doc_url);
    } catch (e) {
      setError(
        formatApiError(
          e,
          "Sage couldn't reach the live backend. If Cloud Run just restarted, wait 30-40 seconds and try again."
        )
      );
      // Show fallback brief
      setBrief(`# Meeting Brief: ${ev.title}\n\n**Attendees:** ${(ev.attendees || []).join(", ") || "N/A"}\n\n## What to expect\nSage will pull relevant emails, Drive files, and open tasks related to this meeting. Start the backend server to see live context.\n\n## Open Action Items\n- [ ] Review agenda\n- [ ] Check related emails from last 30 days\n- [ ] Confirm attendee availability`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Meeting list */}
      <div className="w-64 shrink-0 border-r border-stone-700 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Today's Meetings</h3>
        <div className="space-y-2">
          {meetings.map((ev) => (
            <button
              key={ev.id}
              onClick={() => generate(ev)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                selected?.id === ev.id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-stone-700 bg-stone-800/40 hover:border-stone-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-200 truncate">{ev.title}</p>
                <ChevronRight size={14} className="text-stone-500 shrink-0" />
              </div>
              {ev.attendees?.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
                  <Users size={10} />
                  {ev.attendees.length} attendee{ev.attendees.length !== 1 ? "s" : ""}
                </div>
              )}
              {ev.duration_min && (
                <p className={`text-xs mt-0.5 ${ev.duration_min > 60 ? "text-amber-400" : "text-stone-500"}`}>
                  {ev.duration_min}min
                </p>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-600 mt-4">Click a meeting to generate its pre-meeting context brief using Sage AI.</p>
      </div>

      {/* Brief content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={40} className="text-stone-700 mb-3" />
            <p className="text-stone-400 font-medium">Select a meeting to generate its brief</p>
            <p className="text-stone-600 text-sm mt-1">Sage will pull emails, Drive files, and open tasks related to this meeting</p>
          </div>
        )}

        {selected && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-1 text-sm text-stone-400 mt-0.5">
                  <Users size={13} />
                  {(selected.attendees || []).join(", ") || "No attendees"}
                </div>
              </div>
              {docUrl && (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/20 transition-colors"
                >
                  <ExternalLink size={12} />
                  Open in Google Docs
                </a>
              )}
            </div>

            {error && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-violet-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Sage is building your pre-meeting context brief...
              </div>
            )}

            {brief && (
              <div className="rounded-xl bg-stone-800 border border-stone-700 p-5">
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-stone-100 prose-p:text-stone-300 prose-li:text-stone-300 prose-a:text-indigo-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sage tip */}
      <div className="w-72 shrink-0 border-l border-stone-700 p-4 overflow-y-auto">
        <div className="rounded-xl bg-violet-900/20 border border-violet-500/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-violet-300">Sage Tip</p>
          <p className="text-xs text-stone-400">
            Pre-meeting briefs pull context from Gmail, Drive, and your task list — giving you everything you need in one place, 5 minutes before the call.
          </p>
          <p className="text-xs text-stone-500 mt-2 italic">
            "Give me 6 hours to chop down a tree and I will spend the first 4 sharpening the axe." — Abraham Lincoln
          </p>
        </div>

        {selected && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Suggested Questions</p>
            {[
              "What was decided in the last meeting with these attendees?",
              "What open tasks are related to this topic?",
              "Are there any recent emails I should be aware of?",
            ].map((q) => (
              <div key={q} className="text-xs text-stone-400 bg-stone-800 rounded-lg px-3 py-2 border border-stone-700">
                {q}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
