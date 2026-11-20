"use client";
// Chat con Brain. La conversación vive solo en esta pestaña (memoria del navegador); no se guarda en la base de datos.
import { useRef, useState, type FormEvent } from "react";
import { dict, type Lang } from "../i18n";

type Msg = { role: "user" | "assistant"; text: string };

// Muestra el formato que Brain usa: "## Título", "- viñeta", "1. paso".
function BrainText({ text }: { text: string }) {
  return <div className="grid gap-1.5 text-sm leading-relaxed">
    {text.split("\n").map((line, i) => {
      const l = line.trim();
      if (!l) return null;
      if (l.startsWith("## ")) return <p key={i} className="mt-2 font-bold text-slate-950">{l.slice(3)}</p>;
      if (l.startsWith("- ")) return <p key={i} className="pl-4 before:-ml-3 before:mr-1.5 before:content-['•']">{l.slice(2)}</p>;
      return <p key={i}>{l}</p>;
    })}
  </div>;
}

export default function BrainChat({ lang, initialUsed, limit }: { lang: Lang; initialUsed: number | null; limit: number }) {
  const t = dict(lang);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(initialUsed);
  const endRef = useRef<HTMLDivElement>(null);
  const atLimit = used !== null && used >= limit;

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy || atLimit) return;
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next); setDraft(""); setBusy(true); setError("");
    try {
      const res = await fetch("/api/brain/dueno", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, language: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data.used === "number") setUsed(data.used);
      if (!res.ok || typeof data.reply !== "string") { setError(typeof data.error === "string" ? data.error : t.brainError); return; }
      setMessages([...next, { role: "assistant", text: data.reply }]);
    } catch {
      setError(t.brainError);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    }
  }

  function submit(e: FormEvent) { e.preventDefault(); void ask(draft); }

  return <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold text-slate-500">{used === null ? "" : t.brainUsage(used, limit)}</p>
      {messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setError(""); }}
        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{t.brainNew}</button>}
    </div>

    {messages.length === 0 && <div className="grid gap-2">
      {t.brainExamples.map((q) => <button key={q} type="button" disabled={busy || atLimit} onClick={() => void ask(q)}
        className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:border-blue-400">{q}</button>)}
    </div>}

    <div className="grid gap-3" aria-live="polite">
      {messages.map((m, i) => m.role === "user"
        ? <div key={i} className="ml-auto max-w-[85%] rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white">
            <span className="sr-only">{t.brainYou}: </span>{m.text}</div>
        : <div key={i} className="max-w-[95%] rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
            <p className="mb-1 text-xs font-bold text-blue-700">Brain</p><BrainText text={m.text} /></div>)}
      {busy && <p className="text-sm text-slate-500">{t.brainThinking}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div ref={endRef} />
    </div>

    <form onSubmit={submit} className="flex gap-2">
      <label className="sr-only" htmlFor="brain-question">{t.brainPlaceholder}</label>
      <textarea id="brain-question" value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000}
        placeholder={t.brainPlaceholder} disabled={busy || atLimit}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(draft); } }}
        className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      <button type="submit" disabled={busy || atLimit || !draft.trim()}
        className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.brainSend}</button>
    </form>
  </section>;
}
