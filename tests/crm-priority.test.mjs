import assert from "node:assert/strict";
import test from "node:test";
import { compareContactPriority } from "../app/lib/crm/model.ts";

const now = Date.parse("2026-11-07T16:00:00.000Z");
function contact(id, overrides = {}) {
  return {
    id, name: id, company: "", phone: "", stage: "Nuevo", assignee: "", followUpAt: null,
    lastSeenAt: "2026-11-07T15:00:00.000Z", notes: "", request: "", nextAction: "", unread: 0,
    channel: "Web", messages: [], ...overrides,
  };
}

test("oldest unread conversation is prioritized before newer customer messages", () => {
  const older = contact("older", { unread: 1, oldestUnreadAt: "2026-11-06T10:00:00.000Z" });
  const newer = contact("newer", { unread: 2, oldestUnreadAt: "2026-11-07T12:00:00.000Z" });
  assert.ok(compareContactPriority(older, newer, now) < 0);
});

test("unread conversations precede overdue follow-ups; oldest overdue task comes next", () => {
  const unread = contact("unread", { unread: 1, oldestUnreadAt: "2026-11-07T09:00:00.000Z" });
  const earlierDue = contact("earlier", { followUpAt: "2026-11-05T12:00:00.000Z" });
  const laterDue = contact("later", { followUpAt: "2026-11-06T12:00:00.000Z" });
  assert.ok(compareContactPriority(unread, earlierDue, now) < 0);
  assert.ok(compareContactPriority(earlierDue, laterDue, now) < 0);
});

test("closed opportunities are not elevated by stale follow-up dates", () => {
  const closed = contact("closed", { stage: "Perdido", followUpAt: "2026-11-01T12:00:00.000Z" });
  const active = contact("active", { stage: "Interesado" });
  assert.ok(compareContactPriority(active, closed, now) < 0);
});

test("future follow-ups are ordered by their scheduled time", () => {
  const sooner = contact("sooner", { followUpAt: "2026-11-07T17:00:00.000Z" });
  const later = contact("later", { followUpAt: "2026-11-08T17:00:00.000Z" });
  assert.ok(compareContactPriority(sooner, later, now) < 0);
});
