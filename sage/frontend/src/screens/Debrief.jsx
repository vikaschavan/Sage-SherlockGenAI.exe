import { useState } from "react";
import { CheckSquare, Mail, Calendar, FileText, Loader2, Zap, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { todayEvents } from "../data/mockEvents";
import { formatApiError, runDebrief } from "../api/sage";

const meetings = todayEvents.filter((e) => e.type === "meeting");

const SAMPLE_NOTES = `Product Review Meeting — April 7, 2026

Attendees: Alice, Bob, Carol

Discussion:
- Q2 roadmap was reviewed. Feature X delayed by 2 weeks.
- Auth module PR needs review by EOD Thursday.
- Alice to send revised timeline to stakeholders.
- Bob volunteered to lead the CloudOps negotiation call.
- Agreed: all status updates to move async starting next week.

Decisions:
- Feature X launch pushed to April 22.
- Carol will onboard Priya by April 12.
- Weekly standup moved to async Slack update.`;

export default function Debrief() {
  const [selectedMeeting, setSelectedMeeting] = useState(meetings[0]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDebrief() {
    if (!notes.trim()) {
      setNotes(SAMPLE_NOTES);
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await runDebrief(
        selectedMeeting.title,
        today,
        selectedMeeting.attendees || [],
        notes
      );
      setResult(res);
    } catch (e) {
      setError(
        formatApiError(
          e,
          "Sage couldn't reach the live backend. If Cloud Run just restarted, wait 30-40 seconds and try again."
        )
      );
      setResult({
        reply: `## Debrief: ${selectedMeeting.title}\n\n### Action Items Extracted\n- [ ] Alice: Send revised timeline to stakeholders (due Apr 10)\n- [ ] Bob: Lead CloudOps negotiation call (due Apr 8)\n- [ ] Carol: Onboard Priya Sharma (due Apr 12)\n- [ ] Team: Move weekly standup to async Slack\n\n### Follow-up Email Draft\nHi team,\n\nThanks for a productive session. Here are the key decisions and next steps from today's Product Review...\n\n### Calendar Blocks Suggested\n- Block 1hr Thursday for Auth PR review\n- Block 30min Friday for stakeholder follow-up\n\n### Summary Doc\nCreated in Google Docs (backend required for live link)`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Input panel */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-violet-400" />
            Post-Meeting Debrief
          </h2>
          <p className="text-sm text-stone-400 mt-1">
            Paste your meeting notes. Sage extracts action items, drafts follow-ups, and blocks calendar time automatically.
          </p>
        </div>

        {/* Meeting selector */}
        <div>
          <label className="text-xs text-stone-400 font-medium uppercase tracking-wider block mb-2">Meeting</label>
          <div className="flex gap-2 flex-wrap">
            {meetings.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedMeeting(ev)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedMeeting?.id === ev.id
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600"
                }`}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </div>

        {/* Notes textarea */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-stone-400 font-medium uppercase tracking-wider">Meeting Notes</label>
            <button
              onClick={() => setNotes(SAMPLE_NOTES)}
              className="text-xs text-indigo-400 hover:text-teal-300"
            >
              Load sample notes
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your meeting notes, transcript, or action items here..."
            className="flex-1 min-h-48 w-full rounded-xl bg-stone-800 border border-stone-700 text-sm text-stone-200 p-4 placeholder-stone-600 focus:outline-none focus:border-violet-500 resize-none font-mono"
          />
        </div>

        <button
          onClick={handleDebrief}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sage is processing...
            </>
          ) : (
            <>
              <Zap size={16} />
              {notes.trim() ? "Run Debrief" : "Load Sample Notes First"}
            </>
          )}
        </button>

        {error && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Results panel */}
      <div className="w-96 shrink-0 border-l border-stone-700 p-5 overflow-y-auto space-y-4">
        {!result && !loading && (
          <div className="text-center text-stone-600 pt-16">
            <Zap size={32} className="mx-auto mb-2" />
            <p className="text-sm">Debrief results will appear here</p>
            <p className="text-xs mt-1">Action items, email draft, calendar blocks</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-violet-400 text-sm pt-8">
            <Loader2 size={16} className="animate-spin" />
            Extracting action items and drafting follow-ups...
          </div>
        )}

        {result && (
          <>
            {/* Action items */}
            <div className="rounded-xl bg-stone-800 border border-stone-700 p-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <CheckSquare size={14} className="text-emerald-400" />
                Debrief Output
              </h3>
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-stone-200 prose-p:text-stone-300 prose-li:text-stone-300 prose-a:text-indigo-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.reply || result.debrief || JSON.stringify(result, null, 2)}
                </ReactMarkdown>
              </div>
              {result.doc_url && (
                <a
                  href={result.doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400 hover:text-teal-300"
                >
                  <ExternalLink size={11} />
                  Open Summary Doc
                </a>
              )}
            </div>

            {/* Ivy Lee prompt */}
            <div className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-4">
              <p className="text-xs font-semibold text-amber-300 mb-1">Ivy Lee Method</p>
              <p className="text-xs text-stone-400">
                Before you close — write down your <strong className="text-white">6 most important tasks for tomorrow</strong>. Start with #1 and don't move on until it's done.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
