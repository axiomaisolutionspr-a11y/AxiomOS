import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./home-cinematic.css";

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
        {children}
        <a className="axiom-robotics-entry" href="/robotics" aria-label="Explorar AxiomAI Robotics">
          <span className="axiom-robotics-entry-dot" />
          <span><strong>NUEVO</strong> AxiomAI Robotics</span>
          <b>→</b>
        </a>
      </body>
    </html>
  );
}
