import type { Metadata } from "next";
import RoboticsExperience from "./robotics-client";

export const metadata: Metadata = {
  title: "AxiomAI Robotics | Robot Match para empresas",
  description:
    "AxiomAI Robotics analiza tu operación, compara tecnologías y diseña la solución robótica correcta para tu negocio en Puerto Rico.",
};

export default function RoboticsPage() {
  return <RoboticsExperience />;
}
