// Pure helpers for the Meta inbox (Messenger + Instagram) used in /prospectos/meta-inbox.
// No token values are ever returned by these helpers.

export const CHANNELS = ["instagram", "messenger"];
export const MAX_TEXT = 1000;

export function normalizeChannel(value) {
  return CHANNELS.includes(value) ? value : "instagram";
}

export function validateOutgoing({ channel, recipientId, text }) {
  if (!CHANNELS.includes(channel)) return { ok: false, error: "invalid_channel" };
  if (!/^\d{5,40}$/.test(String(recipientId ?? ""))) return { ok: false, error: "invalid_recipient" };
  const body = String(text ?? "").trim();
  if (!body) return { ok: false, error: "empty_message" };
  if (body.length > MAX_TEXT) return { ok: false, error: "message_too_long" };
  return { ok: true, value: { channel, recipientId: String(recipientId), text: body } };
}

export function sendRequest({ channel, recipientId, text, pageId, version = {} }) {
  if (channel === "instagram") {
    return {
      url: `https://graph.instagram.com/${version.instagram || "v26.0"}/me/messages`,
      body: { recipient: { id: recipientId }, message: { text } },
    };
  }
  return {
    url: `https://graph.facebook.com/${version.facebook || "v25.0"}/${encodeURIComponent(pageId)}/messages`,
    body: { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text } },
  };
}

// Graph returns conversations with participants and nested messages (newest first).
export function parseConversations(payload, ownIds) {
  const own = new Set((ownIds || []).filter(Boolean).map(String));
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((conversation) => {
    const participants = Array.isArray(conversation?.participants?.data) ? conversation.participants.data : [];
    const customer = participants.find((p) => p?.id && !own.has(String(p.id))) || null;
    const messages = (Array.isArray(conversation?.messages?.data) ? conversation.messages.data : [])
      .map((m) => ({
        id: String(m?.id ?? ""),
        text: typeof m?.message === "string" ? m.message : "",
        at: typeof m?.created_time === "string" ? m.created_time : null,
        fromBusiness: own.has(String(m?.from?.id ?? "")),
      }))
      .filter((m) => m.id)
      .reverse();
    return {
      id: String(conversation?.id ?? ""),
      updatedAt: typeof conversation?.updated_time === "string" ? conversation.updated_time : null,
      customerId: customer ? String(customer.id) : null,
      customerName: customer ? String(customer.username || customer.name || "Customer") : "Customer",
      messages,
    };
  }).filter((c) => c.id && c.customerId);
}

export function graphErrorSummary(payload, status) {
  const error = payload?.error ?? {};
  return {
    status,
    code: Number.isInteger(error.code) ? error.code : null,
    subcode: Number.isInteger(error.error_subcode) ? error.error_subcode : null,
  };
}

export function friendlyError(code) {
  switch (code) {
    case "invalid_channel":
    case "invalid_recipient": return "Select a conversation first.";
    case "empty_message": return "Type a message before sending.";
    case "message_too_long": return `Messages can have up to ${MAX_TEXT} characters.`;
    case "window_closed": return "This person last wrote more than 24 hours ago. Meta only allows replies inside the 24-hour window.";
    case "session": return "Your CRM session expired. Sign in again.";
    case "config": return "The Meta connection is not configured on the server.";
    default: return "Meta did not accept the message. Try again in a moment.";
  }
}
