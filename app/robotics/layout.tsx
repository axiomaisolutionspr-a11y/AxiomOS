import "./robotics.css";
import "./cinematic.css";
import "./scenes.css";
import CinematicShowcase from "./cinematic-showcase";

export default function RoboticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CinematicShowcase />
      {children}
    </>
  );
}
