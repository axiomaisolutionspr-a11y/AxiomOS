import { commercialIdentityAuthConfig, commercialIdentityDatabase } from "../../../lib/commercial-identity";
import AccessForm from "./access-form";

export const dynamic = "force-dynamic";

export default function AutopilotAccessPage() {
  if (!commercialIdentityAuthConfig() || !commercialIdentityDatabase()) {
    return <main className="mx-auto grid min-h-screen max-w-md place-content-center px-5 text-slate-900">
      <h1 className="text-2xl font-bold">Acceso comercial no habilitado</h1>
      <p className="mt-3">El catálogo de AxiomOS Autopilot todavía no está disponible en este entorno.</p>
    </main>;
  }
  return <AccessForm />;
}
