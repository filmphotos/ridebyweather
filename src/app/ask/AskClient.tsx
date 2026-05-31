"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProBadge from "@/components/Pro/ProBadge";
import ProPaywall from "@/components/Pro/ProPaywall";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "What should I wear for a 7 AM ride tomorrow?",
  "Best riding window in the next 24 hours?",
  "Should I bike or run today?",
  "What's the wind doing tomorrow morning?",
];

export default function AskClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Try to get the user's location once on mount. The AI is much more useful
  // with real forecast data than without — but we don't block on it; a question
  // like "tell me about e-bike laws in NY" works fine with no location.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Fall back to IP-based geo via our existing endpoint.
        fetch("/api/geo-ip")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.lat && d?.lng) setCoords({ lat: d.lat, lng: d.lng });
          })
          .catch(() => {});
      },
      { timeout: 4000, maximumAge: 600_000 }
    );
  }, []);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: question };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

      setMessages((m) => [...m, userMsg, assistantMsg]);
      setInput("");
      setBusy(true);
      setError(null);

      // History = everything before this turn. Capped server-side at 10 entries.
      const history = messages.map(({ role, content }) => ({ role, content }));

      try {
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            history,
            lat: coords?.lat,
            lng: coords?.lng,
          }),
        });

        if (res.status === 402) {
          setPaywall(true);
          setMessages((m) => m.filter((x) => x.id !== assistantId)); // drop empty assistant bubble
          return;
        }
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed (${res.status})`);
        }

        // Stream the plaintext response into the last assistant message.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, content: x.content + chunk } : x))
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
        // Drop the empty assistant bubble if nothing streamed
        setMessages((m) =>
          m.filter((x) => !(x.id === assistantId && x.content.length === 0))
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, coords]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  if (paywall) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <ProPaywall
          feature="AI Ride Assistant"
          description="Ask anything about today's ride and get answers grounded in your real forecast and saved spots — clothing, timing, route picks, wind shifts."
          limitLine="The AI assistant is a Pro feature."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-white">AI Ride Assistant</h1>
        <ProBadge />
      </div>

      {/* Scrolling chat history */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/40 p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">🤖</div>
            <p className="max-w-sm text-sm text-gray-400">
              Ask me about today&apos;s conditions, the best time to ride, or what to wear.
              I&apos;ll use your real forecast and saved spots.
            </p>
            <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  disabled={busy}
                  className="rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 text-left text-xs text-gray-300 hover:border-sky-500/50 hover:bg-gray-800 disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
            {!coords && (
              <p className="text-[11px] text-gray-600">
                Tip: allow location for forecast-grounded answers.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-sky-600 text-white"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  {m.content || (busy ? <Cursor /> : null)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask anything…"
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-gray-600">
        Powered by Claude. Answers use your current forecast and saved spots — never invented data.
      </p>
    </div>
  );
}

function Cursor() {
  return <span className="inline-block h-3 w-2 animate-pulse bg-gray-400" />;
}
