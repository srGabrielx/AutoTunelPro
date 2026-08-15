"use client";

import { useEffect, useState } from "react";

// The BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user already dismissed in this session
    const isDismissed = typeof window !== "undefined" && sessionStorage.getItem("pwa_banner_dismissed");
    if (isDismissed) return;

    // Show banner after 2.5 seconds on first visit
    const timer = setTimeout(() => {
      // Don't show if already standalone (installed app)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
      if (!isStandalone) {
        setIsVisible(true);
      }
    }, 2500);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
        sessionStorage.setItem("pwa_banner_dismissed", "true");
      }
      setInstallPrompt(null);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt (iOS Safari, Desktop Chrome already cached, etc.)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setInfoMessage("Para instalar no iOS: toque no botão Compartilhar ⎋ e selecione 'Adicionar à Tela de Início' ⊞.");
      } else {
        setInfoMessage("Para instalar: abra o menu do navegador (⋮) e clique em 'Instalar AutoTunel' ou 'Adicionar à tela inicial'.");
      }
      setTimeout(() => setInfoMessage(null), 7000);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem("pwa_banner_dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner-overlay">
      <div className="install-banner">
        <div className="install-banner-content">
          <img src="/logo.png" alt="AutoTunel Logo" className="install-banner-logo" />
          <div className="install-banner-text">
            <strong>Instalar AutoTunel Studio</strong>
            <span>{infoMessage || "Adicione o app à sua tela inicial para geração de beats super rápida e offline."}</span>
          </div>
        </div>
        <div className="install-banner-actions">
          <button className="btn-close" onClick={handleClose}>Agora Não</button>
          <button className="btn-install" onClick={handleInstallClick}>Instalar App</button>
        </div>
      </div>
    </div>
  );
}
