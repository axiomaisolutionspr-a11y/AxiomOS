import {redirect} from "next/navigation";
import {commercialIdentityAuth} from "../../../lib/commercial-identity-auth";
import {commercialIdentityDatabase,commercialOfferWriterDatabase,commercialMember} from "../../../lib/commercial-identity";
import {sendQaAutopilotSmsOnce} from "./sms-action";
import {checkQaSmsDeliveryStatus} from "./status-action";
import {executeOneSignedTelnyxProbe} from "./signed-probe-action";
export const dynamic="force-dynamic";
const messages:Record<string,string>={
 disabled:"Prueba desactivada.",not_configured:"Configuración de QA incompleta.",
 not_authenticated:"Acceso requerido.",not_owner:"Solo propietario.",
 provider_unavailable:"Falta configurar Telnyx en Preview.",
 not_claimable:"La reserva no está disponible, está fuera de horario o ya se consumió.",
 claim_invalid:"La reserva no pasó las validaciones.",
 accepted:"Telnyx aceptó el SMS. Falta confirmar entrega real.",
 rejected:"Proveedor rechazó el envío. No habrá reintento.",
 uncertain:"Resultado incierto. Reenvío automático bloqueado.",
 receipt_not_saved:"Aceptación posible sin registro: conciliación manual obligatoria.",
 manual_reconciliation:"Error tras la reserva. Conciliar manualmente; no reintentar.",
 delivered_api:"Telnyx confirmó el estado delivered mediante consulta autenticada a su API. No equivale al webhook firmado.",
 pending_api:"Telnyx aún no confirma la entrega final. Puedes consultar el estado nuevamente sin enviar otro SMS.",
 failed_api:"Telnyx reportó que el SMS falló. No habrá reenvío automático.",
 unconfirmed_api:"Telnyx no pudo confirmar la entrega final.",
 lookup_failed:"No se pudo consultar el estado de Telnyx.",
 lookup_mismatch:"Telnyx no devolvió el identificador o destinatario esperado.",
 no_provider_receipt:"Aún no existe un envío aceptado por Telnyx.",
 provider_status_unknown:"Estado del proveedor desconocido; no se supone entrega."
};
export default async function QaE2eSms({searchParams}:{
 searchParams:Promise<{resultado?:string;firma?:string}>
}){
 if(process.env.VERCEL_ENV!=="preview"||
    process.env.AXIOMOS_AUTOPILOT_E2E_QA_ENABLED!=="true")
    return <main className="p-8">QA no habilitado.</main>;
 const reader=commercialIdentityDatabase(),auth=commercialIdentityAuth();
 if(!reader||!auth) return <main className="p-8">Conexión QA no configurada.</main>;
 const {data,error}=await auth.getSession();
 if(error||!data?.user?.id) redirect("/prospectos/autopilot/acceso");
 const member=await commercialMember(reader,data.user.id);
 if(member?.role!=="owner")
  return <main className="p-8">Solo propietario; sin envíos.</main>;
 const p=await searchParams;
 let signedProbeStatus="unavailable";
 let signedProbeAttempts=0;
 try {
   const writer=commercialOfferWriterDatabase();
   if(writer){
     const rows=await writer`SELECT id,state,attempts,provider_message_id
       FROM axiomos_commercial.qa_telnyx_signed_probe_status(CAST(${data.user.id} AS uuid))`;
     signedProbeStatus=String(rows[0]?.state??"unavailable");
     signedProbeAttempts=Number(rows[0]?.attempts??0);
   }
 } catch {console.error("QA_TELNYX_SIGNED_PROBE_STATUS_UNAVAILABLE");}
 let deliveryState="unavailable";
 try {
   const writer=commercialOfferWriterDatabase();
   if(writer) {
     const rows=await writer`SELECT id,provider_message_id,state FROM
       axiomos_commercial.qa_e2e_get_receipt(CAST(${data.user.id} AS UUID))`;
     deliveryState=String(rows[0]?.state??"unavailable");
   }
 } catch {
   console.error("QA_E2E_READ_STATUS_UNAVAILABLE");
 }
 const alreadyAttempted=["claimed","accepted","uncertain","rejected","sent","delivered","failed","unconfirmed"].includes(deliveryState);
 const enabled=process.env.AXIOMOS_QA_E2E_SMS_SEND_ENABLED==="true" && deliveryState==="ready";
 return <main className="mx-auto max-w-2xl p-8 text-slate-950">
  <h1 className="text-3xl font-bold">AxiomOS · Certificación E2E</h1>
  <p className="my-4">Un único SMS al teléfono interno terminado en 0132, entre
    las 9 a. m. y las 6 p. m. de Puerto Rico. Ningún prospecto será contactado.</p>
  {deliveryState==="delivered" &&
    <p role="status" className="my-4 rounded border border-green-300 bg-green-50 p-4 text-green-950">
      Certificación SMS completada: Telnyx confirmó DELIVERED mediante consulta autenticada a su API.
      El envío único ya se consumió y no se repetirá. La prueba de webhook firmado se registra aparte.
    </p>}
  {deliveryState==="ready" && <p className="my-3 rounded border p-3">
    Autorización disponible: ningún SMS enviado todavía.</p>}
  {alreadyAttempted && deliveryState!=="delivered" && <p role="status" className="my-3 rounded border p-3">
    Intento único consumido. Estado actual: {deliveryState}. No habrá reenvío automático.</p>}
  {p.resultado&&messages[p.resultado] && !(p.resultado==="not_claimable" && alreadyAttempted) &&
    <p role="status" className="my-4 rounded border p-4">{messages[p.resultado]}</p>}
  {enabled?<form action={sendQaAutopilotSmsOnce}>
    <button className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">
      Ejecutar un SMS de certificación</button>
   </form>:<p className="rounded border p-4">
    {alreadyAttempted ? "El envío de certificación ya se intentó. Botón desactivado para impedir duplicados." :
      "Envío real desactivado o autorización no disponible."}
   </p>}
  <form action={checkQaSmsDeliveryStatus} className="mt-4">
   <button className="rounded border border-blue-900 px-4 py-3 font-semibold text-blue-900">
    Consultar estado real del SMS en Telnyx (sin reenviar)</button>
  </form>
  <section className="mt-7 rounded-xl border border-slate-300 p-5">
    <h2 className="text-xl font-bold">Verificar webhook firmado de Telnyx</h2>
    <p className="mt-2 text-sm">Una sola prueba adicional autorizada al teléfono interno terminado en 0132.
    El recibo va exclusivamente a un verificador público QA, separado del CRM. No modifica el webhook actual.</p>
    <p className="mt-2 font-medium">Estado: {signedProbeStatus} · Intentos: {signedProbeAttempts} de 1</p>
    {p.firma && <p role="status" className="mt-3 rounded border p-3">{({
      disabled:"Prueba desactivada.",not_configured:"Falta configuración QA.",
      not_authenticated:"Se requiere sesión.",not_owner:"Acceso exclusivo del propietario.",
      provider_unavailable:"Falta la configuración de Telnyx en Preview.",
      not_claimable:"Reserva no disponible, ya consumida o fuera de horario.",
      invalid_claim:"Reserva rechazada por seguridad.",
      accepted:"Telnyx aceptó el SMS. Falta verificar webhook real firmado.",
      rejected:"Telnyx rechazó el SMS; no se reintentará.",
      uncertain:"Resultado incierto: no se volverá a enviar.",
      reconcile_manually:"No está confirmada la respuesta. No reintentar."
    } as Record<string,string>)[p.firma]??"Estado registrado."}</p>}
    {signedProbeStatus==="ready" &&
      process.env.AXIOMOS_QA_TELNYX_SIGNED_PROBE_ENABLED==="true" ?
      <form className="mt-3" action={executeOneSignedTelnyxProbe}>
        <button className="rounded bg-blue-900 px-4 py-3 font-semibold text-white">
          Autorizar y ejecutar el único SMS para probar firma Telnyx
        </button>
      </form>:
      <p className="mt-3 rounded border p-3">
        {signedProbeAttempts>0?"Esta autorización ya se usó; no se permite otro envío.":
         "Prueba pendiente de habilitación final. No se ha enviado el mensaje."}
      </p>}
  </section>
  <p className="mt-4 text-sm">No compartir códigos de acceso. La aceptación del proveedor
    no demuestra entrega y ningún fallo dispara un reintento.</p>
 </main>;
}
