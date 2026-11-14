"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

export function assinarConexao(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

export const lerConexao = () => navigator.onLine;

// Faixa no topo enquanto o aparelho estiver sem internet: o que for mudado agora pode não ser salvo.
export function SemInternet() {
  const online = useSyncExternalStore(assinarConexao, lerConexao, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-base text-white"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      Sem internet. O que você mudar agora pode não ser salvo.
    </div>
  );
}
