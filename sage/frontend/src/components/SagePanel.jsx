import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SagePanel({ title = "Sage AI", onAsk, proactive = [] }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(
    proactive.length > 0
      ? [{ role: "sage", text: proactive.join("\n\n") }]
      : []
  );
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const result = await onAsk(userMsg);
      if (result?.reply) {
        setMessages((m) => [...m, { role: "sage", text: result.reply }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "sage",
          text: "I couldn't reach the Sage backend. If the service just restarted, give it 30-40 seconds to warm up and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-96 shrink-0 flex flex-col bg-stone-900 border-l border-stone-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <div>
          <span className="font-semibold text-white text-sm block">{title}</span>
          <span className="text-[11px] text-stone-500">First AI reply can take ~30s after cold start.</span>
        </div>
        <span className="ml-auto text-xs text-violet-400 bg-violet-900/40 px-2 py-0.5 rounded-full">AI</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-stone-500 text-xs text-center mt-8">
            Ask Sage anything about your schedule, tasks, or priorities.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 text-sm ${
              msg.role === "user"
                ? "bg-teal-600/20 text-indigo-100 ml-4"
                : "bg-stone-800 text-stone-200 mr-2"
            }`}
          >
            {msg.role === "sage" ? (
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            ) : (
              <p>{msg.text}</p>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-violet-400 text-xs bg-stone-800 rounded-xl p-3">
            <Loader2 size={14} className="animate-spin" />
            Sage is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-stone-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Sage..."
            className="flex-1 bg-stone-800 text-white text-sm px-3 py-2 rounded-lg border border-stone-600 focus:outline-none focus:border-violet-500 placeholder-stone-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
