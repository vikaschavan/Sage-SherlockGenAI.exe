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
    <div className="w-96 shrink-0 flex flex-col bg-stone-900 border-l border-stone-700">
      <div className="px-4 py-3 border-b border-stone-700 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <span className="font-semibold text-white text-sm block">{title}</span>
          <span className="text-[11px] text-stone-500">First AI reply can take about 30 seconds after a cold start.</span>
        </div>
        <span className="ml-auto text-xs text-cyan-300 bg-cyan-900/40 px-2 py-0.5 rounded-full">AI</span>
      </div>

      {contextLabel && (
        <div className="px-4 py-2 border-b border-stone-800 text-xs text-stone-400 bg-stone-900/70">
          {contextLabel}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-stone-500 text-xs text-center mt-8">
            Ask Sage about your priorities, meetings, blockers, or follow-through.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-xl p-3 text-sm ${
              message.role === "user"
                ? "bg-cyan-600/20 text-cyan-100 ml-4"
                : "bg-stone-800 text-stone-200 mr-2"
            }`}
          >
            {message.role === "sage" ? (
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
              </div>
            ) : (
              <p>{message.text}</p>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 text-xs bg-stone-800 rounded-xl p-3">
            <Loader2 size={14} className="animate-spin" />
            Sage is thinking...
          </div>
        )}
        {suggestedPrompts.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">Try asking</p>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => usePrompt(prompt)}
                className="w-full text-left text-xs text-stone-300 bg-stone-800 hover:border-cyan-500/40 border border-stone-700 rounded-lg px-3 py-2 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-stone-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder="Ask Sage..."
            className="flex-1 bg-stone-800 text-white text-sm px-3 py-2 rounded-lg border border-stone-600 focus:outline-none focus:border-cyan-500 placeholder-stone-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
