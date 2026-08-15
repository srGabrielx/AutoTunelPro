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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show custom install prompt banner
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    
    setInstallPrompt(null);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner-overlay">
      <div className="install-banner">
        <div className="install-banner-content">
          <img src="/logo.png" alt="AutoTunel Logo" className="install-banner-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div className="install-banner-text">
            <strong>Instalar AutoTunel Studio</strong>
            <span>Adicione o app à sua tela inicial para acesso rápido e offline.</span>
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
