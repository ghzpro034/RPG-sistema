"use client";

import { useEffect } from "react";

// Liga o service worker (public/sw.js) só no site publicado; em desenvolvimento ele atrapalharia o recarregamento.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // sem service worker o site funciona igual; só perde a tela de "sem internet"
    });
  }, []);
  return null;
}
