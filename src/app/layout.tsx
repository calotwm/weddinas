import type { Metadata } from "next";
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
  icons: { icon: "https://weddinas.com/wp-content/uploads/2023/06/iso.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${heading.variable} ${body.variable} ${script.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
