import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoTunel Studio - Gerador de Melodias, Drums & 808",
  description: "Três motores procedurais independentes para Melodia, Bateria e Baixo 808. Exporte em MIDI e WAV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
