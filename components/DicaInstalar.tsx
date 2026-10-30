"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const CHAVE = "asm_dica_instalar_fechada";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function lerFechada() {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

// já está aberto como app (tela cheia) ou não é celular: não mostra nada
function lerDispensavel() {
  const instalado =
    matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  const celular = matchMedia("(pointer: coarse)").matches;
  return Boolean(instalado) || !celular || lerFechada();
}

const nada = () => () => {};

// Dica para instalar o app no celular. iPhone: ensina o caminho do Safari. Android: botão "Instalar".
export function DicaInstalar() {
  // no servidor fica escondida; no navegador decide na hora
  const dispensavel = useSyncExternalStore(nada, lerDispensavel, () => true);
  const iphone = useSyncExternalStore(nada, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [fechada, setFechada] = useState(false);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalado = () => setFechada(true);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalado);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalado);
    };
  }, []);

  if (dispensavel || fechada) return null;

  function fechar() {
    setFechada(true);
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {
      // sem armazenamento a dica só volta na próxima visita
    }
  }

  return (
    <aside className="flex items-start gap-3 rounded-xl border border-ouro/30 bg-ouro/5 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone estático do app */}
      <img src="/icones/icone-192.png" alt="" className="size-11 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-base leading-snug">
        <p className="font-heading text-sm tracking-wider text-ouro uppercase">Instale no celular</p>
        {iphone ? (
          <p>
            No Safari, toque em <Share className="inline size-4 -translate-y-0.5" aria-label="Compartilhar" /> e depois
            em <b>Adicionar à Tela de Início</b>.
          </p>
        ) : evento ? (
          <Button
            size="lg"
            className="mt-2 h-11"
            onClick={async () => {
              await evento.prompt();
              const { outcome } = await evento.userChoice;
              if (outcome === "accepted") fechar();
              setEvento(null);
            }}
          >
            <Download /> Instalar o app
          </Button>
        ) : (
          <p>
            No menu do navegador (<b>⋮</b>), toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon-lg" className="size-11 shrink-0" aria-label="Fechar dica" onClick={fechar}>
        <X />
      </Button>
    </aside>
  );
}
