export const STAGES = ["Nuevo", "Seguimiento", "Contactado", "Interesado", "Cita agendada", "Cotización enviada", "Negociación", "Vendido", "Perdido"] as const;
export type Stage = typeof STAGES[number];
export type Channel = "WhatsApp" | "Llamada" | "Web";
export type Message = { id: string; text: string; at: string; channel: Channel; incoming: boolean };
export type Contact = {
  id: string; name: string; company: string; phone: string; stage: Stage;
  assignee: string; followUpAt: string | null; lastSeenAt: string;
  notes: string; request: string; nextAction: string; unread: number;
  channel: Channel; messages: Message[];
};
export type Sector = "optica" | "dealer";
export function phoneKey(value: string) { return value.replace(/\D/g, "").slice(-10); }
export function isClosed(contact: Contact) { return contact.stage === "Vendido" || contact.stage === "Perdido"; }
export function needsAttention(contact: Contact, now = Date.now()) {
  return contact.unread > 0 || (!isClosed(contact) && Boolean(contact.followUpAt) && new Date(contact.followUpAt!).getTime() <= now);
}
export function nextAction(contact: Pick<Contact, "stage" | "unread" | "followUpAt">) {
  if (contact.unread > 0) return "Revisar la conversación y decidir cómo responder.";
  if (contact.stage === "Cita agendada") return "Confirmar la cita y revisar los preparativos.";
  if (contact.stage === "Cotización enviada") return "Dar seguimiento a la cotización.";
  if (contact.stage === "Vendido") return "Revisar si necesita atención después de la venta.";
  if (contact.stage === "Perdido") return "Caso cerrado. Conservar el historial.";
  if (contact.followUpAt) return "Contactar al cliente en la fecha programada.";
  return "Contactar al cliente y acordar el próximo paso.";
}
export function summaryFromNotes(notes: string) {
  const match = [...notes.matchAll(/(?:Solicitud|Solicitud del cliente|Motivo):\s*([^\n]+)/g)].at(-1);
  return match?.[1]?.slice(0, 220) || "Revisar el historial para conocer lo que necesita.";
}
export function cleanNotes(notes: string) {
  return notes.replace(/^.*\[WA_(?:REQUEST|EMAIL_ACCEPTED|SMS_ATTEMPT|SMS_ACCEPTED):[^\]]+\].*\n?/gm, "").trim();
}
export function dateLabel(value: string | null) {
  if (!value) return "Sin programar";
  return new Intl.DateTimeFormat("es-PR", { day:"numeric", month:"short", hour:"numeric", minute:"2-digit", timeZone:"America/Puerto_Rico" }).format(new Date(value));
}
export function inputDate(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"America/Puerto_Rico", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date(value));
  const part = (type:string) => parts.find(p => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
