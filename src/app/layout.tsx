import type { Metadata, Viewport } from "next";
import { Allura, DM_Serif_Display, Questrial } from "next/font/google";
import "./globals.css";

// MADE Mirage and Roustel (used on weddinas.com) are personal-use licensed;
// these Google Fonts are the closest freely licensed matches.
const heading = DM_Serif_Display({ variable: "--font-heading", weight: "400", subsets: ["latin"] });
const body = Questrial({ variable: "--font-body", weight: "400", subsets: ["latin"] });
const script = Allura({ variable: "--font-script-face", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weddinas | Portal de novios",
  description: "El portal de cada pareja Weddinas: cuenta regresiva, propuestas, reportes y su página de casamiento.",
};

export const viewport: Viewport = { themeColor: "#2b635a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> because the Tailwind theme tokens that reference them are declared on :root.
    <html lang="es-AR" className={`${heading.variable} ${body.variable} ${script.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
