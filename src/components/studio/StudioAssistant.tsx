"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function StudioAssistant({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, isSending]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      const result = (await response.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

      if (!response.ok || !result?.reply) {
        setError(result?.error ?? "The assistant could not reply. Try again.");
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
    } catch {
      setError("Connection failed. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }

  if (!open) return null;

  return (
    <section
      id="studio-assistant-panel"
      aria-label="Studio AI assistant"
      className="fixed inset-x-2 bottom-3 z-50 flex max-h-[min(660px,calc(100dvh-92px))] flex-col overflow-hidden rounded-lg border border-[#343944] bg-[#101318] shadow-2xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[360px] lg:bottom-5 lg:left-[232px]"
    >
      <header className="flex items-center justify-between border-b border-[#292D35] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-[#E4E6EA]">Studio assistant</p>
          <p className="mt-0.5 text-[10px] text-[#858D99]">Ask about reliefs, controls, or credits</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid size-8 place-items-center rounded-md text-[#A9AFBA] hover:bg-[#242833] hover:text-white focus-visible:outline-2 focus-visible:outline-[#FFB547]"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="min-h-36 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="rounded-md border border-[#292D35] bg-[#15181E] p-3">
            <p className="text-xs font-medium text-[#E4E6EA]">How can I help?</p>
            <p className="mt-1.5 text-[11px] leading-5 text-[#9BA2AD]">
              Ask how to prepare an image, use depth settings, export a model, or understand credit costs.
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[92%] whitespace-pre-wrap rounded-md px-3 py-2 text-[11px] leading-5 ${message.role === "user" ? "ml-auto bg-[#302719] text-[#F4DFC0]" : "border border-[#292D35] bg-[#15181E] text-[#D0D4DB]"}`}
          >
            {message.content}
          </div>
        ))}
        {isSending && (
          <p role="status" className="text-[10px] text-[#858D99]">Thinking…</p>
        )}
        {error && <p role="alert" className="text-[10px] leading-4 text-rose-300">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-[#292D35] p-3">
        <label className="sr-only" htmlFor="studio-assistant-input">Message the Studio assistant</label>
        <textarea
          id="studio-assistant-input"
          value={input}
          onChange={(event) => setInput(event.currentTarget.value.slice(0, 2000))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={2000}
          rows={2}
          placeholder="Ask a question…"
          className="max-h-28 min-h-12 w-full resize-y rounded-md border border-[#343944] bg-[#0B0D11] px-3 py-2 text-xs text-[#E4E6EA] placeholder:text-[#68707C] focus:border-[#FFB547] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[9px] text-[#737A86]">AI can make mistakes. Verify important details.</span>
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="rounded-md bg-[#FFB547] px-3 py-1.5 text-[10px] font-semibold text-[#15130F] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
