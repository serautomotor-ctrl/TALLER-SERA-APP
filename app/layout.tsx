import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import { TallerNav } from "@/components/TallerNav";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  weight: ["500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Automecánica Sera — Gestión de taller",
  description: "Programa de gestión del taller: órdenes, clientes, facturación y más.",
};

export const viewport: Viewport = {
  themeColor: "#14161A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${barlowCondensed.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <TallerNav>{children}</TallerNav>
      </body>
    </html>
  );
}
