import type { Metadata } from "next";
import "./globals.css";
import "./product.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "PJ Suite",
  description: "Contratos, entregas e acompanhamento para profissionais criativos.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
