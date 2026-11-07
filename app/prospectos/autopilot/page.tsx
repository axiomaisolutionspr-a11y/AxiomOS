import { redirect } from "next/navigation";
import { qaIdentityDatabase, qaMember } from "../../lib/qa-identity";
import { qaIdentityAuth } from "../../lib/qa-identity-auth";
import SignOut from "./sign-out";

export const dynamic = "force-dynamic";
export default async function AutopilotQaPage() {
  const auth=qaIdentityAuth(), sql=qaIdentityDatabase();
  if(!auth||!sql) return <main className="p-8"><h1>Acceso individual QA no configurado</h1></main>;
  const {data,error}=await auth.getSession();
  if(error||!data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership=await qaMember(sql,data.user.id); } catch { return <main className="p-8"><h1>No se pudo verificar tu permiso</h1></main>; }
  if(!membership) return <main className="p-8"><h1>Tu cuenta no tiene permiso para esta empresa</h1><SignOut/></main>;
  return <main className="mx-auto max-w-3xl space-y-5 p-8 text-slate-900">
    <p className="font-semibold text-blue-700">AxiomOS Autopilot · QA</p>
    <h1 className="text-3xl font-bold">Bienvenido, {data.user.name||data.user.email}</h1>
    <p>Empresa: AxiomAI Solutions · permiso: {membership.role}.</p>
    <p>La sesión se verifica con Neon Auth y tu permiso se consulta en la base QA en cada acceso.</p>
    <SignOut/>
  </main>;
}
