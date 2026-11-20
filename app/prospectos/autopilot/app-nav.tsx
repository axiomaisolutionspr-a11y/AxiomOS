import Link from "next/link";
import type { Dict } from "./i18n";

// Menú principal del CRM: lleva a cada pantalla de Autopilot. "Brain" y "Bajas" solo aparecen si están habilitados.
export default function AppNav({ t, current, optOut = false }: { t: Dict; current: "panel" | "brain" | "catalogo" | "demo" | "bajas"; optOut?: boolean }) {
  const items: Array<[typeof current, string, string]> = [
    ["panel", t.navPanel, "/prospectos/autopilot"],
    ["catalogo", t.navCatalog, "/prospectos/autopilot/catalogo"],
    ["demo", t.navDemo, "/prospectos/autopilot/demo"],
  ];
  // Brain (asistente del dueño) solo aparece si está activado en el entorno.
  if (process.env.BRAIN_OWNER_ENABLED === "true") items.splice(1, 0, ["brain", t.navBrain, "/prospectos/autopilot/brain"]);
  if (optOut) items.push(["bajas", t.navOptOut, "/prospectos/autopilot/bajas-whatsapp"]);
  return <nav aria-label={t.navLabel} className="flex gap-2 overflow-x-auto">
    {items.map(([key, label, href]) => <Link key={key} href={href} aria-current={current === key ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${current === key ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>{label}</Link>)}
  </nav>;
}
