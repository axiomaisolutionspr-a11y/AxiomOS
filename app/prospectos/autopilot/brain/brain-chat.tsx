"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Dict, Lang } from "../i18n";
import { askBrain } from "./actions";

type Msg = { role: "user" | "brain"; text: string; free?: boolean };

// Conversación con Brain. La conversación vive solo en esta pantalla (no se guarda el texto).
export default function BrainChat({ t, lang, used: usedStart, limit: limitStart, suggestions }: {
  t: Dict["brain"]; lang: Lang; used: number; limit: number; suggestions: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [used, setUsed] = useState(usedStart);
  const [limit, setLimit] = useState(limitStart);
  const [blocked, setBlocked] = useState(usedStart >= limitStart);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, pending]);

  const ask = (question: string) => {
    const q = question.trim();
    if (q.length < 2 || pending) return;
    setError(""); setDraft("");
    const previous = messages.map(({ role, text }) => ({ role, text }));
    setMessages((m) => [...m, { role: "user", text: q }]);
    start(async () => {
      const r = await askBrain(q, lang, previous);
      if (!r.ok) { setError(r.error ?? ""); return; }
      if (typeof r.used === "number") setUsed(r.used);
      if (typeof r.limit === "number") setLimit(r.limit);
      if (r.blocked) { setBlocked(true); setMessages((m) => m.slice(0, -1)); return; }
      setMessages((m) => [...m, { role: "brain", text: r.answer ?? "", free: r.free }]);
      if (typeof r.used === "number" && typeof r.limit === "number" && r.used >= r.limit) setBlocked(true);
    });
  };
  const left = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return <section aria-label={t.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold" aria-live="polite">{t.meter(left, limit)}</p>
      <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={t.meter(left, limit)}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>

    <div className="mt-4 grid max-h-[55vh] min-h-40 gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3" aria-live="polite">
      {messages.length === 0 && <div>
        <p className="text-sm text-slate-600">{t.suggestions}:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => <button key={s} type="button" disabled={blocked || pending} onClick={() => ask(s)}
            className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-blue-800 disabled:opacity-50">{s}</button>)}
        </div>
      </div>}
      {messages.map((m, i) => <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
        {m.role === "brain" && <img src="/axiomos-brain-icon.webp" alt="" width={28} height={28} className="mt-1 h-7 w-7 shrink-0 rounded-full bg-slate-950 p-0.5" />}
        <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
          <span className="sr-only">{m.role === "user" ? t.you : t.title}: </span>{m.text}
          {m.free && <span className="mt-1 block text-xs font-semibold text-slate-500">{t.free}</span>}
        </div>
      </div>)}
      {pending && <p className="text-sm text-slate-500">{t.thinking}</p>}
      <div ref={end} />
    </div>

    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {blocked ? <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">{t.blockedTitle}</p>
      <p className="mt-1 text-sm">{t.blockedText}</p>
      <a href="#plan" className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{t.packTitle} →</a>
    </div>
      : <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label className="sr-only" htmlFor="brain-q">{t.placeholder}</label>
        <input id="brain-q" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} placeholder={t.placeholder}
          autoComplete="off" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base" />
        <button type="submit" disabled={pending || draft.trim().length < 2} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{t.send}</button>
      </form>}
    <p className="mt-3 text-xs text-slate-500">{t.privacy} {t.resets}</p>
  </section>;
}
