import { redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialOfferWriterDatabase, commercialMember } from "../../../../../lib/commercial-identity";

export const dynamic = "force-dynamic";

type Diagnostic = {role: string; database: string; branch: string; hasFunction: boolean; hasTable: boolean; host: string};

async function inspect(label: string, sql: NonNullable<ReturnType<typeof commercialIdentityDatabase>>, url?: string): Promise<Diagnostic> {
  const rows = await sql`SELECT current_user AS db_role, current_database() AS database_name,
    COALESCE(current_setting('neon.branch_id',true),'unavailable') AS branch_id,
    to_regprocedure('axiomos_commercial.claim_one_sms_cert_test(uuid)') IS NOT NULL AS has_function,
    to_regclass('axiomos_commercial.sms_certification_attempt') IS NOT NULL AS has_table`;
  let host = "sin configurar";
  try { if(url) host = new URL(url).hostname; } catch {}
  return {role: label+" / "+String(rows[0]?.db_role??""),database:String(rows[0]?.database_name??""),
    branch:String(rows[0]?.branch_id??""),hasFunction:rows[0]?.has_function===true,
    hasTable:rows[0]?.has_table===true,host};
}

export default async function SmsDatabaseDiagnostic() {
  const auth=commercialIdentityAuth(), reader=commercialIdentityDatabase(), writer=commercialOfferWriterDatabase();
  if(!auth||!reader||!writer)return <main className="p-8">Diagnóstico no disponible</main>;
  const {data,error}=await auth.getSession();
  if(error||!data?.user)redirect("/prospectos/autopilot/acceso");
  const membership=await commercialMember(reader,data.user.id);
  if(membership?.role!=="owner")return <main className="p-8">Acceso denegado</main>;
  const isLive = process.env.VERCEL_ENV === "production" &&
    process.env.AXIOMOS_COMMERCIAL_LIVE_DATABASE_ENABLED === "true";
  const readerUrl = isLive ? process.env.AXIOMOS_COMMERCIAL_LIVE_DATABASE_URL
    : process.env.AXIOMOS_COMMERCIAL_DATABASE_URL;
  const writerUrl = isLive ? process.env.AXIOMOS_COMMERCIAL_LIVE_WRITER_URL
    : process.env.AXIOMOS_COMMERCIAL_WRITER_URL;
  const tests=await Promise.allSettled([
    inspect("Lector",reader,readerUrl),
    inspect("Escritor",writer,writerUrl)
  ]);
  const read=(x:PromiseSettledResult<Diagnostic>)=>x.status==="fulfilled"?x.value:null;
  const a=read(tests[0]),b=read(tests[1]);
  return <main className="mx-auto max-w-3xl p-6 text-slate-950"><h1 className="mb-3 text-2xl font-bold">Diagnóstico de conexiones CRM</h1>
   <p>Solo muestra metadatos de conexión. No envía mensajes, no consume el intento SMS ni modifica datos.</p>
   {[a,b].map((d,i)=><section key={i} className="my-4 rounded-lg border p-4"><h2 className="font-bold">{i===0?"Lector":"Escritor"}</h2>
   {d?<dl className="mt-2 space-y-1 text-sm"><div>Rol: {d.role}</div><div>Base: {d.database}</div><div>Rama: {d.branch}</div><div>Host: {d.host}</div><div>Función: {d.hasFunction?"Existe":"NO ENCONTRADA"}</div><div>Tabla de reserva: {d.hasTable?"Existe":"NO ENCONTRADA"}</div></dl>:<p>Consulta fallida; revisar la configuración de conexión.</p>}</section>)}
   <p className="rounded-lg border bg-slate-50 p-3">Enrutamiento comercial activo: {isLive?"rama con actividad WhatsApp":"configuración anterior"}.
    Se muestran los servidores de las conexiones efectivamente utilizadas; la rama principal de Neon no es el objetivo obligatorio.
    Este diagnóstico no confirma la entrega del SMS.</p>
   <a className="mr-4 underline" href="/prospectos/autopilot/seguimientos/prueba-sms/evidencia">Consultar comprobante Telnyx</a>
   <a className="underline" href="/prospectos/autopilot/seguimientos/prueba-sms">Volver</a>
  </main>;
}
