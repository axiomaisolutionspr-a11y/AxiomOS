import type { Metadata } from "next";
import PosDemo from "./PosDemo";

export const metadata: Metadata = {
  title: "Estaciones de cobro | AxiomOS CRM",
  description: "Prototipo aislado de estaciones de cobro para el CRM de AxiomAI.",
};

export default function CobrosPage() {
  return <PosDemo />;
}
