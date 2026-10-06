import "./robotics.css";
import "./cinematic.css";
import "./scenes.css";
import "./language.css";
import "./sector-icons.css";
import "./polish-v2.css";
import CinematicShowcase from "./cinematic-showcase";
import { RoboticsLanguageProvider } from "./robotics-language";

export default function RoboticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoboticsLanguageProvider>
      <div className="ax-robotics-video-backdrop" aria-hidden="true">
        <video className="ax-robotics-video-fill" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/axiomai-robotics-blur-fill.mp4" type="video/mp4" />
        </video>
        <video className="ax-robotics-video-main" autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/axiomai-robotics-background-hq.mp4" type="video/mp4" />
        </video>
        <div className="ax-robotics-video-shade" />
      </div>
      <CinematicShowcase />
      {children}
    </RoboticsLanguageProvider>
  );
}
