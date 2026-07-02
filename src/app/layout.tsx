import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestion Clinique",
  description: "Application de gestion clinique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
