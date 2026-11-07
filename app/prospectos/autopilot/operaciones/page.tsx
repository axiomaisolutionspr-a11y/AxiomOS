import Link from "next/link";
import { redirect } from "next/navigation";
import { qaIdentityAuth } from "../../../lib/qa-identity-auth";
import { qaIdentityDatabase,qaMember } from "../../../lib/qa-identity";
import { autopilotPanelDatabase, loadAutopilotPanel,panelReadAllowed } from "../../../lib/axiomos-autopilot-panel-qa.mjs";
export const dynamic="force-dynamic";
export default async function OperationsQaPage(){
  const auth=qaIdentityAuth(),identity=qaIdentityDatabase();
  if(!auth||!identity)return <main className="p-6">Panel QA no configurado.</main>;
  const {data,error}=await auth.getSession();
  if(error||!data?.user)redirect("/prospectos/autopilot/acceso");
  let member;
  try{member=await qaMember(identity,data.user.id);}catch{return <main className="p-6">No se pudo verificar el permiso.</main>;}
  if(!member||!panelReadAllowed(member.role))return <main className="p-6">Acceso denegado.</main>;
  const sql=autopilotPanelDatabase();
  let result=null;
  if(sql)try{result=await loadAutopilotPanel(sql);}catch{result=null;}
  const label={owner:"Propietario",operator:"Operador",viewer:"Consulta"}[member.role];
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-slate-950 p-6 text-white">
        <p className="text-sm font-bold tracking-widest text-blue-300">AXIOMOS AUTOPILOT · QA SINTÉTICA</p>
        <h1 className="mt-2 text-3xl font-bold">Centro de operaciones de Axira</h1>
        <p className="mt-2 text-slate-300">Sesión individual verificada · {label} · Solo lectura</p>
        <Link className="mt-3 inline-block underline" href="/prospectos/autopilot">Volver al catálogo QA</Link>
      </header>
      {!result?<section role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <h2 className="text-xl font-bold">Conexión de datos pendiente</h2>
        <p className="mt-2">El panel no muestra cifras inventadas. Falta configurar acceso de lectura limitado a la rama hija Neon QA de almacenamiento. No se mostrarán contactos reales.</p>
      </section>:<>
        <section className="grid gap-3 sm:grid-cols-3">{[
          ["Prospectos ficticios",result.summary.prospects],
          ["Tareas por aprobar",result.summary.awaiting],
          ["Eventos sintéticos",result.summary.events],
        ].map(([name,value])=><div key={name} className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm">{name}</p><strong className="mt-2 block text-3xl">{value}</strong></div>)}</section>
        <section className="rounded-xl bg-white p-6"><h2 className="text-xl font-bold">Cola de trabajo</h2><p className="text-sm text-slate-600">Son recomendaciones, no acciones ejecutadas.</p><ul className="mt-4 space-y-3">{result.tasks.map(t=><li key={t.channel+":"+t.event_id} className="rounded-lg border p-3"><strong>{t.priority==="high"?"ALTA":t.priority==="medium"?"MEDIA":"NORMAL"}</strong> · {t.kind} · {t.contact_key}<p className="text-sm">{t.channel} · Pendiente de aprobación</p></li>)}</ul>{result.tasks.length===0&&<p>No hay tareas sintéticas.</p>}</section>
        <section className="rounded-xl bg-white p-6"><h2 className="text-xl font-bold">Prospectos sintéticos</h2><ul className="mt-3 space-y-2">{result.prospects.map(p=><li key={p.contact_key} className="border-b py-2">{p.contact_key} · {p.events_seen} eventos</li>)}</ul></section>
        <section className="rounded-xl bg-white p-6"><h2 className="text-xl font-bold">Evidencia de auditoría</h2><ul className="mt-3 space-y-2">{result.audit.map(a=><li key={a.channel+":"+a.event_id} className="border-b py-2">{a.channel}/{a.event_id} · {a.action}</li>)}</ul></section>
      </>}
      <p className="text-sm text-slate-600">Entorno QA aislado. No se envían mensajes, no se aprueban tareas ni se consulta producción.</p>
    </div>
  </main>;
}
