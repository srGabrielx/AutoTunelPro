"use client";

import React, { useEffect, useState } from "react";
import BeatStudio from "../../components/BeatStudio";

export default function StudioClientWrapper() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if running in Tauri desktop environment, standalone PWA, or local dev machine
    const isTauri =
      typeof window !== "undefined" &&
      ("__TAURI__" in window ||
        "__TAURI_INTERNALS__" in window ||
        window.location.protocol === "tauri:" ||
        window.location.protocol === "file:");

    const isStandalonePWA =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local"));

    if (isTauri || isStandalonePWA || isLocalhost) {
      setIsAllowed(true);
    } else {
      setIsAllowed(false);
    }
  }, []);

  if (isAllowed === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060608",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontFamily: "sans-serif",
        }}
      >
        Iniciando motor local...
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#060608",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#f1f5f9",
          padding: "24px",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎛️</div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            marginBottom: "12px",
            background: "linear-gradient(135deg, #a855f7, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AutoTunel Studio é um Aplicativo Local
        </h1>
        <p
          style={{
            maxWidth: "540px",
            color: "#94a3b8",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "28px",
          }}
        >
          Para garantir 0ms de latência, processamento procedural em tempo real e total privacidade, o AutoTunel roda diretamente no seu computador ou celular.
        </p>
        <a
          href="/#downloads"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 32px",
            background: "linear-gradient(135deg, #a855f7, #06b6d4)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: "800",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(168, 85, 247, 0.4)",
            fontSize: "16px",
          }}
        >
          <span>Baixar Aplicativo Grátis</span>
          <span>↓</span>
        </a>
      </div>
    );
  }

  return <BeatStudio />;
}
