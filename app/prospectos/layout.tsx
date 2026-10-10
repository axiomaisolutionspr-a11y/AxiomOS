import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "AxiomAI CRM",
  icons: {
    icon: { url: "/prospectos/icon", type: "image/webp", sizes: "any" },
    shortcut: "/prospectos/icon",
    apple: "/prospectos/icon",
  },
};
export default function CRMLayout({children}:{children:React.ReactNode}) { return children; }
