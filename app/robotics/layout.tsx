import "./robotics.css";
import "./cinematic.css";
import "./scenes.css";
import CinematicShowcase from "./cinematic-showcase";
import { RoboticsLanguageProvider } from "./robotics-language";

export default function RoboticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoboticsLanguageProvider>
      <CinematicShowcase />
      {children}
    </RoboticsLanguageProvider>
  );
}
