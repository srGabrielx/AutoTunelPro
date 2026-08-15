import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallBanner from "../components/InstallBanner";

export const metadata: Metadata = {
  title: "AutoTunel Studio - Gerador de Melodias, Drums & 808",
  description: "Três motores procedurais independentes para Melodia, Bateria e Baixo 808. Exporte em MIDI e WAV.",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "AutoTunel",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <InstallBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
