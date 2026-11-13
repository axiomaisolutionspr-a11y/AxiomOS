import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../../../lib/commercial-identity";
import { evaluateTelnyxSmsCertificate, type TelnyxCertEvidence } from "../../../../../lib/telnyx-cert-evidence";

export const dynamic = "force-dynamic";
const MESSAGE_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function retrieveDeliveryEvidence(id: string): Promise<{ status: number; evidence: TelnyxCertEvidence | null }> {
  if (!process.env.TELNYX_API_KEY) return {status: 503, evidence: null};
  try {
    const res = await fetch("https://api.telnyx.com/v2/messages/" + encodeURIComponent(id), {
      method: "GET",
      headers: {Authorization: "Bearer " + process.env.TELNYX_API_KEY, Accept: "application/json"},
      cache: "no-store", signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { status: res.status, evidence: null };
    const json: unknown = await res.json();
    const payload = json && typeof json === "object" && "data" in json
      ? (json as {data: unknown}).data : null;
    return {status: 200, evidence: evaluateTelnyxSmsCertificate(payload, id)};
  } catch {
    return { status: 502, evidence: null };
  }
}

export default async function TelnyxDeliveryEvidence({searchParams}:{
  searchParams: Promise<{messageId?: string}>;
}) {
  const auth = commercialIdentityAuth(), reader = commercialIdentityDatabase();
  if (!auth || !reader) notFound();
  const {data, error} = await auth.getSession();
  if (error || !data?.user?.id) redirect("/prospectos/autopilot/acceso");
  if ((await commercialMember(reader, data.user.id))?.role !== "owner") notFound();

  const params = await searchParams;
  const rawId = String(params.messageId || "").trim();
  const validId = rawId.length > 0 && MESSAGE_ID.test(rawId);
  const result = validId ? await retrieveDeliveryEvidence(rawId) : null;
  const color = result?.evidence?.status === "delivered" ? "text-green-800" : "text-amber-800";

  return <main className="mx-auto max-w-2xl p-6 text-slate-950">
    <p className="text-sm font-semibold text-blue-800">AxiomOS · Certificación Telnyx</p>
    <h1 className="mt-2 text-2xl font-bold">Comprobante de entrega SMS</h1>
    <p className="my-3">Consulta exclusiva para el propietario. Solo utiliza GET para leer un mensaje
      histórico de Telnyx. <strong>No envía SMS, no renueva la prueba y no cambia datos del CRM.</strong></p>
    <p>Intento único registrado el 9 de noviembre de 2026 a las 10:44 a. m. de Puerto Rico;
      destinatario terminado en 0132. La reserva del intento no confirma entrega.</p>
    <form method="get" className="mt-5 grid gap-3 rounded-lg border bg-white p-4">
      <label className="font-medium" htmlFor="messageId">Identificador original del mensaje Telnyx</label>
      <input id="messageId" name="messageId" required
        pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"
        autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        className="rounded border p-2" defaultValue={validId ? rawId : ""}/>
      <button className="rounded bg-blue-800 px-4 py-2 font-semibold text-white">Consultar estado sin enviar</button>
    </form>
    {rawId && !validId && <p role="alert" className="mt-4">Formato de identificador no válido.</p>}
    {result && <section aria-live="polite" className="mt-5 rounded-lg border bg-white p-4">
      <h2 className="font-semibold">Resultado de Telnyx</h2>
      {result.evidence ? <>
        <p className={color+" mt-2 font-semibold"}>
          {result.evidence.status === "delivered" ? "Entrega confirmada" :
            result.evidence.status === "failed" ? "Fallo confirmado" :
            result.evidence.status === "mismatch" ? "No corresponde al intento certificado" : "Entrega no confirmada"}
        </p>
        <p className="mt-2">{result.evidence.explanation}</p>
        <p>Estado del proveedor: {result.evidence.providerStatus}</p>
        {result.evidence.recordedAt && <p>Fecha del registro: {result.evidence.recordedAt}</p>}
      </> : <p className="mt-2">No se pudo consultar el registro (HTTP {result.status}).
        No se ha enviado ningún mensaje. Verifica el identificador o consulta el informe MDR.</p>}
    </section>}
    <p className="mt-5 text-sm">Si no tienes el identificador, búscalo en un informe de
      detalle de mensajes (MDR) de Telnyx del 9 de noviembre. No generes otro SMS para obtenerlo.</p>
    <Link href="/prospectos/autopilot/seguimientos/prueba-sms/diagnostico"
      className="mt-4 inline-block text-blue-800 underline">Diagnóstico de conexiones</Link>
  </main>;
}
