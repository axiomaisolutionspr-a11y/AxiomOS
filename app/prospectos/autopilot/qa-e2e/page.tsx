import {redirect} from "next/navigation";
import {commercialIdentityAuth} from "../../../lib/commercial-identity-auth";
import {commercialIdentityDatabase,commercialOfferWriterDatabase,commercialMember} from "../../../lib/commercial-identity";
import {sendQaAutopilotSmsOnce} from "./sms-action";
import {checkQaSmsDeliveryStatus} from "./status-action";
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
 searchParams:Promise<{resultado?:string}>
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
  <p className="mt-4 text-sm">No compartir códigos de acceso. La aceptación del proveedor
    no demuestra entrega y ningún fallo dispara un reintento.</p>
 </main>;
}
