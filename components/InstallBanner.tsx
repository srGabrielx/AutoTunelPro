"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

export default function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode (installed app)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches || !!window.navigator.standalone);

    if (isStandalone) {
      return;
    }

    const isDismissed = typeof window !== "undefined" && sessionStorage.getItem("pwa_banner_dismissed");
    if (isDismissed) return;

    if (typeof window !== "undefined" && window.deferredPWAInstallPrompt) {
      queueMicrotask(() => setIsVisible(true));
    }

    const handlePromptReady = () => {
      setIsVisible(true);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.deferredPWAInstallPrompt = e as BeforeInstallPromptEvent;
      setIsVisible(true);
    };

    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show banner after short delay if not installed
    const timer = setTimeout(() => {
      if (!isStandalone && !sessionStorage.getItem("pwa_banner_dismissed")) {
        setIsVisible(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = typeof window !== "undefined" ? window.deferredPWAInstallPrompt : null;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setIsVisible(false);
          sessionStorage.setItem("pwa_banner_dismissed", "true");
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("Para instalar no iOS: toque no botão Compartilhar (⎋) do Safari e selecione 'Adicionar à Tela de Início' (+).");
      } else {
        alert("Para instalar: abra o menu do seu navegador (⋮) no topo e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.");
      }
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
            <span>Instale o aplicativo oficial para criar melodias e beats com resposta instantânea e offline.</span>
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
