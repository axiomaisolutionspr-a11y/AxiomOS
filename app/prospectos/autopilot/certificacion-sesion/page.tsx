import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";
import { requestQaSignInOtp, verifyRevokeQaSession } from "./actions";

export const dynamic = "force-dynamic";

const message: Record<string, string> = {
  otp_enviado: "Código enviado al correo de pruebas. Escríbelo abajo. No lo compartas en el chat.",
  envio_otp_fallido: "No se pudo enviar el código desde QA.",
  no_autorizado: "No estás autorizado a ejecutar esta prueba.",
  codigo_invalido: "El código debe contener seis dígitos.",
  otp_rechazado: "Neon Auth no aceptó el código. Solicita uno nuevo en caso necesario.",
  sin_cookie: "Neon Auth inició el proceso pero no entregó cookie de sesión a la prueba.",
  sesion_no_confirmada: "No se pudo confirmar una sesión QA del usuario previsto.",
  revocacion_aprobada: "QA_HTTP_SESSION_REVOCATION_PASS: la sesión existía y su cookie anterior fue rechazada tras cerrar sesión.",
  revocacion_no_aprobada: "La sesión anterior continúa disponible o el cierre falló. Certificación no aprobada.",
  error_red_qa: "No se completó la comunicación con Neon Auth QA. Certificación pendiente.",
  prueba_fallida: "La prueba no se completó.",
};

export default async function QaSessionCertification({
  searchParams,
}: { searchParams: Promise<{ resultado?: string }> }) {
  const reader = commercialIdentityDatabase();
  const auth = commercialIdentityAuth();
  if (!reader || !auth) return <main className="p-8">Certificación no disponible.</main>;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  const member = await commercialMember(reader, data.user.id);
  if (member?.role !== "owner") {
    return <main className="p-8">Acceso restringido al propietario. No se ha iniciado ninguna prueba.</main>;
  }
  const flag = process.env.VERCEL_ENV === "production" &&
    process.env.AXIOMOS_QA_SESSION_CERT_ENABLED === "true";
  const params = await searchParams;
  const result = params.resultado && message[params.resultado];
  return <main className="mx-auto max-w-2xl p-6 text-slate-950">
    <p className="font-semibold text-blue-700">AxiomOS · Certificación</p>
    <h1 className="mt-2 text-3xl font-bold">Revocación de sesión HTTP</h1>
    <p className="mt-4">Este control emplea únicamente el usuario QA del correo de AxiomAI.
      No cierra tu sesión de producción ni la de Alex y no envía SMS a clientes.</p>
    {result && <div role="status" className="my-4 rounded-xl border bg-slate-100 p-4">{result}</div>}
    {!flag ? <p className="mt-4 rounded-xl border p-4">Prueba desactivada.</p> :
    <div className="mt-6 space-y-6">
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Paso 1 · Recibir código en el correo</h2>
        <p className="my-2 text-sm">Se enviará a axiomaisolutionspr@gmail.com.</p>
        <form action={requestQaSignInOtp}>
          <button className="rounded-lg bg-blue-900 px-4 py-3 text-white">Enviar código QA</button>
        </form>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Paso 2 · Verificar y revocar</h2>
        <p className="my-2 text-sm">Introduce el código únicamente aquí, nunca en el chat. El servidor inicia una sesión de QA,
          comprueba que existe, la cierra y vuelve a comprobar la misma cookie.</p>
        <form action={verifyRevokeQaSession} className="grid gap-3">
          <label htmlFor="qa-otp" className="font-medium">Código de seis dígitos</label>
          <input id="qa-otp" name="otp" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" minLength={6} maxLength={6} required
            className="rounded-lg border p-3" placeholder="000000"/>
          <button className="rounded-lg bg-blue-900 px-4 py-3 text-white">Ejecutar prueba de revocación</button>
        </form>
      </section>
    </div>}
    <p className="mt-6 text-sm text-slate-600">Solo se presenta el resultado de la certificación.
      No se almacenan ni muestran códigos o cookies de sesión.</p>
    <a href="/prospectos/autopilot" className="mt-4 inline-block underline">Regresar a Autopilot</a>
  </main>;
}
