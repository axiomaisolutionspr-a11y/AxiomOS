import CRMWorkspace from "../simple/CRMWorkspace";
export default function DemoCRMPage() {
  // El asistente embebido se habilita solo en Preview QA y con la bandera ya autorizada.
  const axiraAsisteQaEnabled =
    process.env.VERCEL_ENV === "preview" && process.env.AXIRA_ASISTE_QA_ENABLED === "true";
  return <CRMWorkspace mode="demo" initialContacts={[]} axiraAsisteQaEnabled={axiraAsisteQaEnabled} />;
}
