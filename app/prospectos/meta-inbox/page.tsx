import type { Metadata } from "next";
import { friendlyError, normalizeChannel } from "../../lib/meta-inbox.mjs";
import { sendMetaMessage } from "./actions";
import { loadInstagram, loadMessenger } from "./meta";
import "./inbox.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AxiomOS Inbox · Instagram & Messenger" };

const LABEL = { instagram: "Instagram", messenger: "Messenger" } as const;

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Puerto_Rico", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function MetaInboxPage({ searchParams }: {
  searchParams: Promise<{ channel?: string; c?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const channel = normalizeChannel(params.channel) as "instagram" | "messenger";
  const { asset, conversations } = channel === "instagram" ? await loadInstagram() : await loadMessenger();
  const selected = conversations.find((c) => c.id === params.c) || conversations[0] || null;

  return (
    <main className="mi-page" lang="en">
      <header className="mi-header">
        <div>
          <p className="mi-eyebrow">AxiomOS CRM · AxiomAI Solutions</p>
          <h1>Customer Inbox</h1>
          <p className="mi-lead">Read and answer the messages customers send to our own Instagram professional account and Facebook Page. Replies are sent from here through the Meta API and arrive in the customer&apos;s Instagram or Messenger app.</p>
        </div>
        <a className="mi-back" href="/prospectos">← Back to CRM</a>
      </header>

      <section className="mi-step" aria-labelledby="mi-asset">
        <h2 id="mi-asset"><span>1</span> Select the connected account</h2>
        <nav className="mi-tabs" aria-label="Channel">
          {(["instagram", "messenger"] as const).map((key) => (
            <a key={key} href={`?channel=${key}`} className={key === channel ? "is-active" : ""} aria-current={key === channel ? "page" : undefined}>{LABEL[key]}</a>
          ))}
        </nav>
        {asset ? (
          <div className="mi-asset">
            {asset.picture ? <img src={asset.picture} alt="" width={44} height={44} /> : <div className="mi-avatar">{asset.name.slice(0, 1)}</div>}
            <div>
              <strong>{asset.name} {asset.handle ? <em>{asset.handle}</em> : null}</strong>
              <small>{channel === "instagram" ? "Instagram professional account" : "Facebook Page"} · ID {asset.id} · Connected</small>
            </div>
          </div>
        ) : (
          <p className="mi-alert">The {LABEL[channel]} account could not be loaded. Check the connection settings.</p>
        )}
      </section>

      <section className="mi-grid">
        <div className="mi-step" aria-labelledby="mi-conv">
          <h2 id="mi-conv"><span>2</span> Choose a conversation</h2>
          {conversations.length ? (
            <ul className="mi-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <a href={`?channel=${channel}&c=${encodeURIComponent(c.id)}`} className={selected?.id === c.id ? "is-active" : ""}>
                    <strong>{c.customerName}</strong>
                    <small>{c.messages.at(-1)?.text?.slice(0, 60) || "(attachment)"}</small>
                    <time>{when(c.updatedAt)}</time>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="mi-muted">No conversations yet. When a customer writes to this account, the conversation appears here.</p>}
        </div>

        <div className="mi-step" aria-labelledby="mi-thread">
          <h2 id="mi-thread"><span>3</span> Reply to the customer</h2>
          {selected ? (
            <>
              <p className="mi-to">Conversation with <strong>{selected.customerName}</strong> on {LABEL[channel]}</p>
              <ol className="mi-thread">
                {selected.messages.map((m) => (
                  <li key={m.id} className={m.fromBusiness ? "is-out" : "is-in"}>
                    <p>{m.text || "(attachment)"}</p>
                    <time>{m.fromBusiness ? "Sent by AxiomAI" : selected.customerName} · {when(m.at)}</time>
                  </li>
                ))}
              </ol>
              {params.sent ? <p className="mi-ok" role="status">✓ Message sent. It is now delivered to the customer&apos;s {LABEL[channel]} app.</p> : null}
              {params.error ? <p className="mi-alert" role="alert">{friendlyError(params.error)}</p> : null}
              <form action={sendMetaMessage} className="mi-form">
                <input type="hidden" name="channel" value={channel} />
                <input type="hidden" name="conversation" value={selected.id} />
                <input type="hidden" name="recipient" value={selected.customerId ?? ""} />
                <label htmlFor="mi-text">Message</label>
                <textarea id="mi-text" name="text" rows={3} maxLength={1000} required placeholder="Type your reply…" />
                <button type="submit">Send via {LABEL[channel]}</button>
                <small>Only replies to customers who wrote to us in the last 24 hours. We never send promotional or unsolicited messages.</small>
              </form>
            </>
          ) : <p className="mi-muted">Select a conversation to reply.</p>}
        </div>
      </section>
    </main>
  );
}
