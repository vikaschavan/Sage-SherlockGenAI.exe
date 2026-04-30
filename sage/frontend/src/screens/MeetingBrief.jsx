import { useEffect, useState } from "react";
import { Users, ExternalLink, Loader2, FileText, ChevronRight, BadgeAlert, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { todayEvents } from "../data/mockEvents";
import {
  formatApiError,
  getMeetingBrief,
  getMeetingWorkspace,
  planWeek,
} from "../api/sage";
import SagePanel from "../components/SagePanel";

const meetings = todayEvents.filter((event) => event.type === "meeting");

function getEventDate(event) {
  if (event?.start) {
    return event.start.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function buildExecutivePrompts(eventTitle) {
  return [
    `What decision should I push to close in ${eventTitle}?`,
    "Which commitments from the last discussion are still open?",
    "What can I delegate before this meeting starts?",
  ];
}

export default function MeetingBrief({ activeMeeting, setActiveMeeting, backendInfo }) {
  const [selected, setSelected] = useState(activeMeeting || meetings[0] || null);
  const [workspace, setWorkspace] = useState(null);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (activeMeeting?.title && activeMeeting?.id !== selected?.id) {
      setSelected(activeMeeting);
    }
  }, [activeMeeting?.id]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      try {
        const result = await getMeetingWorkspace(
          selected.title,
          getEventDate(selected),
          selected.attendees || [],
        );
        if (cancelled) {
          return;
        }
        setWorkspace(result);
        setBrief(result.brief || "");
        setDocUrl(result.doc_url || null);
        setCached(Boolean(result.has_cached_brief));
      } catch (loadError) {
        if (!cancelled) {
          setError(formatApiError(loadError, "Sage could not load this meeting workspace."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWorkspace();
    setActiveMeeting?.(selected);

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  async function generateBrief(event, forceRefresh = false) {
    setSelected(event);
    setActiveMeeting?.(event);
    setError(null);
    setLoading(true);
    try {
      if (!forceRefresh) {
        const existingWorkspace = await getMeetingWorkspace(
          event.title,
          getEventDate(event),
          event.attendees || [],
        );
        setWorkspace(existingWorkspace);
        if (existingWorkspace.brief) {
          setBrief(existingWorkspace.brief);
          setDocUrl(existingWorkspace.doc_url || null);
          setCached(Boolean(existingWorkspace.has_cached_brief));
          setLoading(false);
          return;
        }
      }

      const result = await getMeetingBrief(
        event.title,
        getEventDate(event),
        event.attendees || [],
      );
      const refreshedWorkspace = await getMeetingWorkspace(
        event.title,
        getEventDate(event),
        event.attendees || [],
      );
      setWorkspace(refreshedWorkspace);
      setBrief(result.reply || refreshedWorkspace.brief || "");
      setDocUrl(result.doc_url || refreshedWorkspace.doc_url || null);
      setCached(Boolean(result.cached));
    } catch (requestError) {
      setError(
        formatApiError(
          requestError,
          "Sage could not refresh this brief. Cached executive context is shown if available.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const assistantPrompts = selected ? buildExecutivePrompts(selected.title) : [];
  const assistantProactive = selected
    ? [
        `**Meeting in focus:** ${selected.title}`,
        workspace?.brief
          ? "I already have the current brief in context. Ask for the decision path, risk, or follow-up angle."
          : "Generate the brief first, then ask for the decision path, risk, or follow-up angle.",
      ]
    : [];

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-64 shrink-0 border-r border-stone-700 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Today's Meetings</h3>
        <div className="space-y-2">
          {meetings.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelected(event)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                selected?.id === event.id
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-stone-700 bg-stone-800/40 hover:border-stone-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-200 truncate">{event.title}</p>
                <ChevronRight size={14} className="text-stone-500 shrink-0" />
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-stone-500">
                <Users size={10} />
                {(event.attendees || []).length} attendee{(event.attendees || []).length !== 1 ? "s" : ""}
              </div>
              <p className="text-xs mt-1 text-stone-500">
                {new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                {" to "}
                {new Date(event.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={40} className="text-stone-700 mb-3" />
            <p className="text-stone-400 font-medium">Select a meeting to open its workspace</p>
            <p className="text-stone-600 text-sm mt-1">Sage will preserve the brief, notes draft, and follow-through state.</p>
          </div>
        )}

        {selected && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-1 text-sm text-stone-400 mt-0.5">
                  <Users size={13} />
                  {(selected.attendees || []).join(", ") || "No attendees"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cached && (
                  <span className="text-xs px-2 py-1 rounded-full text-stone-300 bg-stone-800 border border-stone-700">
                    Brief ready
                  </span>
                )}
                <button
                  onClick={() => generateBrief(selected, true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-stone-300 bg-stone-800 border border-stone-700 px-3 py-1.5 rounded-lg hover:border-stone-600 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} />
                  Refresh brief
                </button>
                {docUrl && (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/20 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Open Doc
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Why it matters</p>
                <p className="text-sm text-stone-300 mt-2">
                  {selected.title === "Apex Client Call"
                    ? "Revenue retention, client confidence, and next-step commitments are all exposed here."
                    : selected.title === "Product Review"
                      ? "This meeting sets delivery confidence, launch timing, and executive expectations."
                      : "This meeting either protects momentum or consumes executive time without a clear decision."}
                </p>
              </div>
              <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Prior notes</p>
                <p className="text-sm text-stone-300 mt-2">
                  {workspace?.notes_draft || "No notes saved yet. The debrief screen will persist notes for this meeting."}
                </p>
              </div>
              <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Open actions</p>
                <div className="mt-2 space-y-2">
                  {(workspace?.action_items || []).slice(0, 3).map((item, index) => (
                    <div key={`${item.title || "action"}-${index}`} className="text-sm text-stone-300">
                      <p>{item.title || item.owner || "Action item"}</p>
                      <p className="text-xs text-stone-500">
                        {(item.owner && `Owner: ${item.owner}`) || "Owner to confirm"}
                        {item.due_date ? ` | Due ${item.due_date}` : ""}
                      </p>
                    </div>
                  ))}
                  {(!workspace?.action_items || workspace.action_items.length === 0) && (
                    <p className="text-sm text-stone-500">No extracted actions yet.</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <BadgeAlert size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Sage is assembling the executive meeting brief...
              </div>
            )}

            <div className="rounded-xl bg-stone-800 border border-stone-700 p-5">
              {brief ? (
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-stone-100 prose-p:text-stone-300 prose-li:text-stone-300 prose-a:text-cyan-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-stone-400 font-medium">No brief generated yet</p>
                  <p className="text-sm text-stone-600 mt-1">
                    Generate the brief to capture decisions, risks, prior commitments, and follow-through.
                  </p>
                  <button
                    onClick={() => generateBrief(selected, true)}
                    disabled={loading}
                    className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    Generate brief
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SagePanel
        title="Meeting Assistant"
        contextLabel={selected ? `Context: ${selected.title}` : ""}
        proactive={assistantProactive}
        suggestedPrompts={assistantPrompts}
        onAsk={(message) => {
          const contextBlock = selected
            ? `Meeting: ${selected.title}\nDate: ${getEventDate(selected)}\nAttendees: ${(selected.attendees || []).join(", ") || "none"}\n\nCurrent brief:\n${workspace?.brief || "No brief yet."}\n\nUser question: ${message}`
            : message;
          return planWeek(contextBlock, `meeting-assistant-${selected?.id || "general"}`);
        }}
      />
    </div>
  );
}
