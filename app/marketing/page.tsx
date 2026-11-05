import type { Metadata } from "next";
import MarketingExperience from "./marketing-client";
import "./marketing.css";

export const metadata: Metadata = {
  title: "Marketing y Publicidad con IA | AxiomAI Solutions",
  description:
    "Producción de videos, diseño, redes sociales, anuncios digitales y automatización de prospectos para negocios en Puerto Rico. AxiomAI Marketing & Creative Studio.",
  alternates: { canonical: "/marketing" },
  openGraph: {
    title: "AxiomAI Marketing & Creative Studio",
    description:
      "Desde la creatividad hasta el seguimiento de prospectos con IA: publicidad digital para negocios.",
    type: "website",
  },
};

export default function MarketingPage() {
  return <MarketingExperience />;
}
