"use server";

import { redirect } from "next/navigation";
import { graphErrorSummary, sendRequest, validateOutgoing } from "../../lib/meta-inbox.mjs";
import { FB_VERSION, IG_VERSION, hasValidSession, instagramToken, pageToken } from "./meta";

const PATH = "/prospectos/meta-inbox";

function back(params: Record<string, string>): never {
  redirect(`${PATH}?${new URLSearchParams(params)}`);
}

export async function sendMetaMessage(formData: FormData) {
  const channel = String(formData.get("channel") ?? "");
  const conversation = String(formData.get("conversation") ?? "");
  const keep = { channel, ...(conversation ? { c: conversation } : {}) };
  if (!(await hasValidSession())) back({ ...keep, error: "session" });

  const checked = validateOutgoing({
    channel,
    recipientId: formData.get("recipient"),
    text: formData.get("text"),
  });
  if (!checked.ok || !checked.value) back({ ...keep, error: checked.error || "invalid" });
  const { recipientId, text } = checked.value;

  const token = channel === "instagram" ? await instagramToken() : pageToken();
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!token || (channel === "messenger" && !pageId)) back({ ...keep, error: "config" });

  const request = sendRequest({ channel, recipientId, text, pageId, version: { instagram: IG_VERSION, facebook: FB_VERSION } });
  let ok = false;
  let closedWindow = false;
  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    ok = response.ok && Boolean(payload?.message_id);
    if (!ok) {
      const summary = graphErrorSummary(payload, response.status);
      closedWindow = summary.code === 10 || summary.subcode === 2018278 || summary.subcode === 2534022;
      console.error("META_INBOX_SEND_REJECTED", { channel, ...summary });
    } else {
      console.info("META_INBOX_SENT", { channel });
    }
  } catch {
    console.error("META_INBOX_SEND_TRANSPORT_FAILED", { channel });
  }
  if (!ok) back({ ...keep, error: closedWindow ? "window_closed" : "send_failed" });
  back({ ...keep, sent: "1" });
}
