import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./home-cinematic.css";
import "./home-cinematic-v2.css";
import "./home-cinematic-v3.css";
import "./home-cinematic-v4.css";
import "./home-cinematic-v5.css";
import "./home-cinematic-v6.css";
import "./home-cinematic-v7.css";
import "./home-cinematic-v8.css";
import "./home-cinematic-v9.css";
import "./home-cinematic-v10.css";
import "./robot-companion.css";
import HomeBackgroundVideo from "./home-background-video";
import SiteExperience from "./site-experience";
import RobotCompanion from "./robot-companion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AxiomAI Solutions",
  description:
    "Automatización, inteligencia artificial y desarrollo de software para empresas.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "facebook-domain-verification": "u3cqzn0y2marft1is7tbneqy02orr9",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HomeBackgroundVideo />
        <SiteExperience />
        <RobotCompanion />
        {children}

        <a
          className="axiom-robotics-portal"
          href="/robotics"
          aria-label="Explorar BrainBot de AxiomAI Robotics"
          title="Explorar BrainBot de AxiomAI Robotics"
        >
          <span className="axiom-robot-avatar" aria-hidden="true">
            <span className="axiom-robot-antenna"><i /></span>
            <span className="axiom-robot-face">
              <span className="axiom-robot-brain-window" />
              <i className="axiom-robot-eye axiom-robot-eye-left" />
              <i className="axiom-robot-eye axiom-robot-eye-right" />
              <i className="axiom-robot-mouth" />
            </span>
            <span className="axiom-robot-neck" />
            <span className="axiom-robot-body"><i /></span>
            <span className="axiom-robot-arm axiom-robot-arm-left" />
            <span className="axiom-robot-arm axiom-robot-arm-right" />
            <span className="axiom-robot-leg axiom-robot-leg-left" />
            <span className="axiom-robot-leg axiom-robot-leg-right" />
          </span>
          <span className="axiom-robotics-copy">
            <small>NUEVO</small>
            <strong>BrainBot</strong>
            <em>Explorar BrainBot →</em>
          </span>
        </a>
      </body>
    </html>
  );
}
