import { notFound, redirect } from "next/navigation";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";
import AsisteWorkspace from "./workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Axira Asiste | AxiomOS Autopilot · QA" };

export default async function AxiraAsisteQaPage() {
  // No se muestra, ejecuta ni conecta en producción.
  if (process.env.VERCEL_ENV !== "preview" || process.env.AXIRA_ASISTE_QA_ENABLED !== "true") {
    notFound();
  }
  const auth = commercialIdentityAuth();
  const sql = commercialIdentityDatabase();
  if (!auth || !sql) {
    return <main className="p-8"><h1>Axira Asiste QA no está configurada</h1><p>Faltan la sesión individual o la base aislada de QA.</p></main>;
  }

  let session;
  try { session = await auth.getSession(); }
  catch { return <main className="p-8"><h1>No se pudo verificar tu sesión de QA</h1></main>; }
  if (session.error || !session.data?.user?.id) {
    redirect("/prospectos/autopilot/acceso");
  }

  let membership;
  try { membership = await commercialMember(sql, session.data.user.id); }
  catch { return <main className="p-8"><h1>No se pudo verificar tu permiso de acceso</h1></main>; }
  if (!membership || membership.role === "viewer") {
    return <main className="p-8"><h1>Este usuario no tiene permiso para usar Axira Asiste QA</h1></main>;
  }
  return <AsisteWorkspace />;
}
