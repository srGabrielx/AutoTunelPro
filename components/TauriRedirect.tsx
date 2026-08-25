"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TauriRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Detecta se estamos rodando dentro do Tauri (Desktop Nativo)
    const isTauriEnv = 
      typeof window !== 'undefined' && 
      (('__TAURI_INTERNALS__' in window) || 
       ('__TAURI__' in window) || 
       window.location.protocol === 'tauri:' ||
       window.location.protocol === 'asset:');
       
    if (isTauriEnv) {
      setIsTauri(true);
      router.replace("/studio");
    }
  }, [router]);

  if (isTauri) {
    // Retorna uma tela de loading minimalista enquanto redireciona pro Studio
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00f0ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}
