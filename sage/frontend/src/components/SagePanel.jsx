import { useEffect, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatApiError } from "../api/sage";

export default function SagePanel({
  title = "Sage AI",
  onAsk,
  proactive = [],
  contextLabel = "",
  suggestedPrompts = [],
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(
    proactive.length > 0 ? [{ role: "sage", text: proactive.join("\n\n") }] : [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (proactive.length > 0) {
      setMessages([{ role: "sage", text: proactive.join("\n\n") }]);
    }
  }, [proactive.join("|")]);

  async function handleSend() {
    if (!input.trim() || loading) {
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((current) => [...current, { role: "user", text: userMessage }]);
    setLoading(true);
    try {
      const result = await onAsk(userMessage);
      if (result?.reply) {
        setMessages((current) => [...current, { role: "sage", text: result.reply }]);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "sage",
          text: formatApiError(
            error,
            "Sage could not reach the live backend. If Cloud Run just restarted, wait 30-40 seconds and try again.",
          ),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function usePrompt(prompt) {
    setInput(prompt);
  }

  return (
    <div className="w-96 shrink-0 flex flex-col sage-surface-muted border-l border-[var(--sage-border)]">
      <div className="px-4 py-3 border-b border-[var(--sage-border)] flex items-center gap-2 bg-[rgba(251,247,240,0.72)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--sage-accent)] flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <span className="font-semibold text-[var(--sage-text)] text-sm block">{title}</span>
          <span className="text-[11px] text-[var(--sage-muted)]">First AI reply can take about 30 seconds after a cold start.</span>
        </div>
        <span className="ml-auto text-xs text-[var(--sage-accent)] bg-[var(--sage-accent-soft)] px-2 py-0.5 rounded-full border border-[color:rgba(15,118,110,0.12)]">AI</span>
      </div>

      {contextLabel && (
        <div className="px-4 py-2 border-b border-[var(--sage-border)] text-xs text-[var(--sage-muted)] bg-[rgba(243,236,225,0.88)]">
          {contextLabel}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-[var(--sage-soft)] text-xs text-center mt-8">
            Ask Sage about your priorities, meetings, blockers, or follow-through.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-xl p-3 text-sm ${
              message.role === "user"
                ? "bg-[var(--sage-accent-soft)] text-[var(--sage-text)] ml-4 border border-[color:rgba(15,118,110,0.16)]"
                : "bg-[rgba(251,247,240,0.92)] text-[var(--sage-text)] mr-2 border border-[var(--sage-border)]"
            }`}
          >
            {message.role === "sage" ? (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:text-[var(--sage-text)] prose-p:text-[var(--sage-text)] prose-li:text-[var(--sage-text)] prose-strong:text-[var(--sage-text)] prose-a:text-[var(--sage-accent)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
              </div>
            ) : (
              <p>{message.text}</p>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[var(--sage-accent)] text-xs bg-[rgba(251,247,240,0.92)] border border-[var(--sage-border)] rounded-xl p-3">
            <Loader2 size={14} className="animate-spin" />
            Sage is thinking...
          </div>
        )}
        {suggestedPrompts.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] uppercase tracking-wider text-[var(--sage-soft)]">Try asking</p>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => usePrompt(prompt)}
                className="w-full text-left text-xs text-[var(--sage-text)] bg-[rgba(251,247,240,0.88)] hover:border-[var(--sage-accent)] border border-[var(--sage-border)] rounded-lg px-3 py-2 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--sage-border)] bg-[rgba(251,247,240,0.72)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder="Ask Sage..."
            className="sage-input flex-1 text-sm px-3 py-2 rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="sage-btn-primary w-9 h-9 rounded-lg disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
