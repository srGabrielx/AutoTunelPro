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

    const handleAppInstalled = () => {
      setIsVisible(false);
      window.deferredPWAInstallPrompt = undefined;
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    };

    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
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
      // Direct silent close without intrusive manual alerts
      setIsVisible(false);
      sessionStorage.setItem("pwa_banner_dismissed", "true");
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
