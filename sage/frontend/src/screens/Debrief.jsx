import { useEffect, useRef, useState } from "react";
import { CheckSquare, ExternalLink, FileText, Loader2, Save, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { todayEvents } from "../data/mockEvents";
import {
  formatApiError,
  getMeetingWorkspace,
  runDebrief,
  saveMeetingWorkspaceDraft,
  createTask,
} from "../api/sage";

const meetings = todayEvents.filter((event) => event.type === "meeting");

const SAMPLE_NOTES = {
  "Product Review": `Product Review - April 30, 2026

Attendees: alice@company.com, bob@company.com, carol@company.com

Discussion:
- Q2 roadmap confidence slipped after the auth refactor review.
- Product launch date is still feasible if QA sign-off lands by Tuesday.
- Priya needs a tighter onboarding plan before she owns customer rollout tasks.

Decisions:
- Hold the current launch date for one more week pending QA confirmation.
- Move status-only updates to async written notes.

Actions:
- Alice to send revised launch timeline by Friday.
- Bob to review auth PR by end of day.
- Carol to draft Priya onboarding checklist.`,
  "Apex Client Call": `Apex Client Call - April 30, 2026

Attendees: priya@apex.com, james@apex.com

Discussion:
- Apex is open to renewal but wants stronger reporting and response SLAs.
- Priya asked for a decision on pilot expansion before next Tuesday.
- James flagged concern about the migration timeline.

Decisions:
- Share an executive summary with a recovery timeline and SLA commitments.
- Propose a phased rollout instead of a full migration cutover.

Actions:
- CEO to approve the pricing guardrails.
- Account lead to send follow-up by tomorrow morning.
- Ops to prepare the phased rollout option set.`,
  default: `Weekly Status Standup - April 30, 2026

Discussion:
- Team reported status updates and blockers.
- Most topics could have been handled asynchronously.

Decisions:
- Convert this weekly meeting into an async status update.

Actions:
- Publish the async template to the team.
- Reserve the recovered hour for deep work.`,
};

function getEventDate(event) {
  if (event?.start) {
    return event.start.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function getSampleNotes(meetingTitle) {
  return SAMPLE_NOTES[meetingTitle] || SAMPLE_NOTES.default;
}

function normalizeTaskTitle(title, fallback) {
  return (title || fallback || "").trim();
}

export default function Debrief({
  activeMeeting,
  setActiveMeeting,
  setActiveScreen,
  tasks = [],
  setTasks,
  meetingNoteDraft,
  setMeetingNoteDraft,
}) {
  const [selectedMeeting, setSelectedMeeting] = useState(activeMeeting || meetings[0] || null);
  const [notes, setNotes] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeMeeting?.title && activeMeeting?.id !== selectedMeeting?.id) {
      setSelectedMeeting(activeMeeting);
    }
  }, [activeMeeting?.id]);

  useEffect(() => {
    if (!meetingNoteDraft?.text || !selectedMeeting) {
      return;
    }

    if (meetingNoteDraft.meetingId && meetingNoteDraft.meetingId !== selectedMeeting.id) {
      return;
    }

    const importedLine = `Captured note:\n- ${meetingNoteDraft.text}`;
    setNotes((current) => {
      if (current.includes(importedLine)) {
        return current;
      }
      return current.trim() ? `${current}\n\n${importedLine}` : importedLine;
    });
    setMeetingNoteDraft?.(null);
  }, [meetingNoteDraft?.text, meetingNoteDraft?.meetingId, selectedMeeting?.id]);

  useEffect(() => {
    if (!selectedMeeting) {
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setError(null);
      try {
        const resultWorkspace = await getMeetingWorkspace(
          selectedMeeting.title,
          getEventDate(selectedMeeting),
          selectedMeeting.attendees || [],
        );
        if (cancelled) {
          return;
        }
        setWorkspace(resultWorkspace);
        setNotes(resultWorkspace.notes_draft || "");
        if (resultWorkspace.debrief) {
          setResult({
            reply: resultWorkspace.debrief,
            doc_url: resultWorkspace.debrief_doc_url,
            mode: resultWorkspace.source_mode,
            cached: resultWorkspace.has_cached_debrief,
          });
        } else {
          setResult(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(formatApiError(loadError, "Sage could not load this meeting workspace."));
        }
      }
    }

    loadWorkspace();
    setActiveMeeting?.(selectedMeeting);

    return () => {
      cancelled = true;
    };
  }, [selectedMeeting?.id]);

  useEffect(() => {
    if (!selectedMeeting || !workspace) {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    setSaveState("saving");
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const updatedWorkspace = await saveMeetingWorkspaceDraft(
          selectedMeeting.title,
          getEventDate(selectedMeeting),
          selectedMeeting.attendees || [],
          notes,
        );
        setWorkspace(updatedWorkspace);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, selectedMeeting?.id]);

  async function handleDebrief() {
    const meetingNotes = notes.trim() || getSampleNotes(selectedMeeting?.title);
    if (!notes.trim()) {
      setNotes(meetingNotes);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await runDebrief(
        selectedMeeting.title,
        getEventDate(selectedMeeting),
        selectedMeeting.attendees || [],
        meetingNotes,
      );
      const refreshedWorkspace = await getMeetingWorkspace(
        selectedMeeting.title,
        getEventDate(selectedMeeting),
        selectedMeeting.attendees || [],
      );
      setWorkspace(refreshedWorkspace);
      setResult(response);
    } catch (requestError) {
      setError(
        formatApiError(
          requestError,
          "Sage could not finish the debrief. Cached notes and prior outputs stay available.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function pushActionItemsToTasks() {
    void (async () => {
      const actionItems = workspace?.action_items || [];
      if (!actionItems.length || !setTasks) {
        return;
      }

      const existingTitles = new Set(tasks.map((task) => task.title.toLowerCase()));
      const createdTasks = [];

      for (let index = 0; index < actionItems.length; index += 1) {
        const item = actionItems[index];
        const title = normalizeTaskTitle(
          item.title || item.task,
          `Follow-up from ${selectedMeeting?.title} ${index + 1}`,
        );
        if (!title || existingTitles.has(title.toLowerCase())) {
          continue;
        }

        existingTitles.add(title.toLowerCase());
        const created = await createTask({
          title,
          description: `Generated from ${selectedMeeting?.title} debrief`,
          priority: index < 2 ? "high" : "medium",
          due_date: item.due_date ? `${item.due_date}T17:00:00` : null,
          project: selectedMeeting?.title?.includes("Apex") ? "Sales" : "Operations",
          assignee: item.owner || "me",
        });
        createdTasks.push({
          ...created,
          id: String(created.id),
          status:
            created.status === "done"
              ? "completed"
              : created.status === "todo"
                ? "pending"
                : created.status,
          due_date: created.due_date ? created.due_date.slice(0, 10) : "",
          isMIT: index < 3,
          isFrog: false,
        });
      }

      if (createdTasks.length) {
        setTasks((previous) => [...createdTasks, ...previous]);
      }
      setActiveScreen?.("tasks");
    })();
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--sage-text)] flex items-center gap-2">
            <Zap size={18} className="text-[var(--sage-accent)]" />
            Post-Meeting Debrief
          </h2>
          <p className="text-sm text-[var(--sage-muted)] mt-1">
            Notes, decisions, and follow-ups stay attached to the selected meeting so the workflow survives a reopen.
          </p>
        </div>

        <div>
          <label className="text-xs text-[var(--sage-soft)] font-medium uppercase tracking-[0.18em] block mb-2">
            Meeting
          </label>
          <div className="flex gap-2 flex-wrap">
            {meetings.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedMeeting(event);
                  setActiveMeeting?.(event);
                }}
                className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                  selectedMeeting?.id === event.id
                    ? "border-[color:rgba(15,118,110,0.2)] bg-[var(--sage-accent-soft)] text-[var(--sage-accent)]"
                    : "border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] text-[var(--sage-muted)] hover:border-[var(--sage-border-strong)]"
                }`}
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="sage-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
              Meeting context
            </p>
            <p className="text-sm text-[var(--sage-text)] mt-2">{selectedMeeting?.title}</p>
            <p className="text-xs text-[var(--sage-muted)] mt-2">
              {(selectedMeeting?.attendees || []).join(", ") || "No attendees listed"}
            </p>
          </div>
          <div className="sage-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
              Saved state
            </p>
            <p className="text-sm text-[var(--sage-text)] mt-2">
              {saveState === "saving"
                ? "Saving notes draft..."
                : saveState === "saved"
                  ? "Draft saved"
                  : saveState === "error"
                    ? "Draft save failed"
                    : "Idle"}
            </p>
            <p className="text-xs text-[var(--sage-muted)] mt-2">
              {workspace?.meeting_id ? `Workspace ID: ${workspace.meeting_id}` : "Workspace not loaded yet"}
            </p>
          </div>
          <div className="sage-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
              Current mode
            </p>
            <p className="text-sm text-[var(--sage-text)] mt-2">
              {result ? "AI summary ready for review" : "Waiting for notes and debrief run"}
            </p>
            <p className="text-xs text-[var(--sage-muted)] mt-2">
              Debrief should end in owners, deadlines, and a sendable follow-up.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--sage-soft)] font-medium uppercase tracking-[0.18em]">
              Meeting Notes
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--sage-muted)] flex items-center gap-1">
                <Save size={11} />
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                      ? "Save failed"
                      : "Autosave"}
              </span>
              <button
                onClick={() => setNotes(getSampleNotes(selectedMeeting?.title))}
                className="text-xs text-[var(--sage-accent)] hover:opacity-80"
              >
                Load sample notes
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <button
              onClick={() => setNotes(getSampleNotes(selectedMeeting?.title))}
              className="sage-btn-secondary text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Core scenario
            </button>
            <button
              onClick={() =>
                setNotes(
                  `${getSampleNotes(selectedMeeting?.title)}\n\nAdded note:\n- CEO wants a draft follow-up by 6 PM.\n- One action should be delegated instead of retained.`,
                )
              }
              className="sage-btn-secondary text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Add executive follow-up pressure
            </button>
            <button
              onClick={() =>
                setNotes(
                  `${getSampleNotes(selectedMeeting?.title)}\n\nAdded note:\n- Team disagreed on owner for the technical risk.\n- Deadline is still unclear and needs normalization.`,
                )
              }
              className="sage-btn-secondary text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Add ambiguity case
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Paste meeting notes, transcript highlights, or action items here..."
            className="sage-input flex-1 min-h-56 w-full rounded-2xl text-sm p-4 resize-none font-mono"
          />
        </div>

        <button
          onClick={handleDebrief}
          disabled={loading || !selectedMeeting}
          className="sage-btn-primary w-full py-3 rounded-xl disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sage is turning notes into follow-through...
            </>
          ) : (
            <>
              <Zap size={16} />
              Run Debrief
            </>
          )}
        </button>

        {error && (
          <p className="text-xs text-[var(--sage-amber)] bg-[var(--sage-amber-soft)] border border-[color:rgba(161,98,7,0.18)] rounded-xl px-3 py-3">
            {error}
          </p>
        )}
      </div>

      <div className="w-96 shrink-0 border-l border-[var(--sage-border)] bg-[rgba(251,247,240,0.58)] p-5 overflow-y-auto space-y-4">
        {!result && !loading && (
          <div className="text-center text-[var(--sage-soft)] pt-16">
            <FileText size={32} className="mx-auto mb-2" />
            <p className="text-sm">Debrief output will appear here</p>
            <p className="text-xs mt-1">Decisions, owners, due dates, follow-up draft, and summary link.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[var(--sage-accent)] text-sm pt-8">
            <Loader2 size={16} className="animate-spin" />
            Extracting decisions and action items...
          </div>
        )}

        {result && (
          <>
            <div className="sage-surface rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-[var(--sage-text)] flex items-center gap-2">
                  <CheckSquare size={14} className="text-[var(--sage-emerald)]" />
                  Executive Debrief
                </h3>
              </div>
              <div className="prose prose-sm max-w-none prose-headings:text-[var(--sage-text)] prose-p:text-[var(--sage-text)] prose-li:text-[var(--sage-text)] prose-strong:text-[var(--sage-text)] prose-a:text-[var(--sage-accent)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.reply || JSON.stringify(result, null, 2)}
                </ReactMarkdown>
              </div>
              {result.doc_url && (
                <a
                  href={result.doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--sage-accent)] hover:opacity-80"
                >
                  <ExternalLink size={11} />
                  Open Summary Doc
                </a>
              )}
            </div>

            <div className="sage-surface rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
                    Action queue
                  </p>
                  <p className="text-sm text-[var(--sage-muted)] mt-1">
                    Move the debrief output into a task queue while the follow-through is still fresh.
                  </p>
                </div>
                <button
                  onClick={pushActionItemsToTasks}
                  disabled={!workspace?.action_items?.length}
                  className="sage-btn-primary px-3 py-2 rounded-lg disabled:opacity-40 text-xs font-medium transition-colors"
                >
                  Push to Tasks
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(workspace?.action_items || []).slice(0, 6).map((item, index) => (
                  <div
                    key={`${item.title || "action"}-${index}`}
                    className="rounded-xl border border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--sage-text)]">{item.title || "Action item"}</p>
                        <p className="text-xs text-[var(--sage-muted)] mt-1">
                          {item.owner ? `Owner: ${item.owner}` : "Owner to confirm"}
                          {item.due_date ? ` | Due ${item.due_date}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-[var(--sage-accent-soft)] border border-[color:rgba(15,118,110,0.14)] text-[var(--sage-accent)]">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                ))}
                {(!workspace?.action_items || workspace.action_items.length === 0) && (
                  <p className="text-sm text-[var(--sage-muted)]">No structured action items saved yet.</p>
                )}
              </div>
            </div>

            <div className="sage-surface rounded-2xl p-4">
              <p className="text-xs font-semibold text-[var(--sage-soft)] uppercase tracking-[0.18em]">
                Next moves
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] px-3 py-3">
                  <p className="text-sm text-[var(--sage-text)]">
                    Promote the confirmed actions into Tasks so tomorrow's execution queue reflects this meeting.
                  </p>
                  <button
                    onClick={pushActionItemsToTasks}
                    disabled={!workspace?.action_items?.length}
                    className="sage-btn-secondary mt-3 px-3 py-2 rounded-lg disabled:opacity-40 text-xs font-medium transition-colors"
                  >
                    Open task follow-through
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] px-3 py-3">
                  <p className="text-sm text-[var(--sage-text)]">
                    Reopen the meeting brief if you need the pre-read, prior commitments, or attendee context before sending follow-up.
                  </p>
                  <button
                    onClick={() => setActiveScreen?.("brief")}
                    className="sage-btn-secondary mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Open meeting brief
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)] px-3 py-3">
                  <p className="text-sm text-[var(--sage-text)]">
                    Return to Today once the action queue is set so the debrief output becomes part of the operating cadence.
                  </p>
                  <button
                    onClick={() => setActiveScreen?.("today")}
                    className="sage-btn-secondary mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Open Today
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
