import Link from "next/link";
import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../../lib/commercial-identity";
import { checkWhatsAppFollowupProvider } from "./provider";

export const dynamic = "force-dynamic";

const reasons = {
  reviewed: "Revisados con consentimiento registrado",
  awaiting_review: "Pendientes de revisión del propietario",
  blocked_review: "Bloqueados o cancelados",
  opted_out: "Con baja registrada",
  no_consent: "Sin consentimiento registrado",
  inactive_followup: "Sin seguimiento activo en el CRM",
  scheduled: "Programados para más adelante",
  no_valid_phone: "Sin número válido en el CRM",
};

const connection = {
  verified: "Verificado",
  unconfigured: "Configuración pendiente",
  unavailable: "No se pudo verificar",
};

async function loadReadiness(
  sql: NonNullable<ReturnType<typeof commercialIdentityDatabase>>,
  userId: string,
) {
  const member = await commercialMember(sql, userId);
  if (member?.role !== "owner") return null;

  const rows = await sql`SELECT readiness, total FROM axiomos_commercial.whatsapp_followup_readiness`;
  const counts = new Map(rows.map(row => [String(row.readiness), Number(row.total)]));
  const provider = await checkWhatsAppFollowupProvider();
  return { counts, provider };
}

export default async function WhatsAppFollowupReadinessPage() {
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED !== "true") {
    return <main className="p-8">Simulación no habilitada.</main>;
  }
  const sql = commercialIdentityDatabase();
  const auth = commercialIdentityAuth();
  if (!sql || !auth) return <main className="p-8">Simulación no disponible.</main>;

  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");

  const result = await loadReadiness(sql, data.user.id).catch(error => {
    console.error("WHATSAPP_FOLLOWUP_READINESS_UNAVAILABLE", (error as { code?: string })?.code ?? "unknown");
  });
  if (result === undefined) return <main className="p-8">No se pudo consultar la simulación. Los envíos siguen deshabilitados.</main>;
  if (result === null) return <main className="p-8">Acceso denegado.</main>;
  const { counts, provider } = result;

  return <main className="mx-auto max-w-3xl p-6 text-slate-950">
    <h1 className="text-2xl font-bold">Simulación de seguimiento por WhatsApp</h1>
    <p className="mt-2">Consulta la cola y la conexión comercial sin enviar mensajes.</p>
    <dl className="my-5 grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div><dt className="font-semibold">Número comercial</dt><dd>{connection[provider.phone]}</dd></div>
      <div><dt className="font-semibold">Plantilla de seguimiento</dt><dd>{connection[provider.template]}</dd></div>
    </dl>
    <h2 className="text-lg font-semibold">Propuestas en la cola</h2>
    <dl className="my-3 divide-y rounded-lg border px-4">
      {Object.entries(reasons).map(([key, label]) => <div key={key} className="flex justify-between gap-3 py-2">
        <dt>{label}</dt><dd>{counts.get(key) ?? 0}</dd>
      </div>)}
    </dl>
    <p className="mb-4 text-sm">La revisión y el consentimiento registrado se muestran para preparar el piloto. Los envíos siguen deshabilitados.</p>
    <Link className="underline" href="/prospectos/autopilot/seguimientos">Volver a seguimientos</Link>
  </main>;
}
