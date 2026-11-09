import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase,commercialMember } from "../../../../lib/commercial-identity";
import { sendOneAuthorizedSmsTest } from "./sms-test-actions";
export const dynamic="force-dynamic";
export default async function SmsCert({searchParams}:{searchParams:Promise<{estado?:string}>}){
 const sql=commercialIdentityDatabase(),auth=commercialIdentityAuth();
 if(!sql||!auth)return <main className="p-8">Acceso no disponible</main>;
 const {data,error}=await auth.getSession();if(error||!data?.user)redirect("/prospectos/autopilot/acceso");
 const membership=await commercialMember(sql,data.user.id);
 if(membership?.role!=="owner")return <main className="p-8">Solo propietario. No se ha enviado ningun mensaje.</main>;
 const {estado}=await searchParams;
 const enabled=process.env.VERCEL_ENV==="production"&&process.env.AXIOMOS_SMS_CERT_TEST_ENABLED==="true";
 return <main className="mx-auto max-w-2xl p-8"><h1 className="text-3xl font-bold">Certificacion SMS — AxiomOS</h1>
 <p className="my-4">Prueba UNICA a un numero autorizado, terminacion <b>0132</b>. No accede a prospectos ni habilita campanas.</p>
 {estado&&<p role="status" className="mb-4 rounded bg-slate-100 p-3">{estado}</p>}
 {enabled?<form action={sendOneAuthorizedSmsTest}><button className="rounded bg-blue-900 px-4 py-3 text-white">Enviar SMS de prueba una sola vez</button></form>:<p>Prueba desactivada.</p>}
 <p className="mt-4 text-sm">La aceptacion del proveedor no confirma entrega. No se reintentara automaticamente, incluso tras un error.</p>
 <a href="/prospectos/autopilot/seguimientos" className="underline">Volver al panel</a></main>
}
