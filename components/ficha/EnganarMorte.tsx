"use client";

import { Skull } from "lucide-react";
import { cn } from "cn";
import { useState } from "react";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";

// "Engana a morte 1 vez" (Agraciado): o player marca que usou; só o mestre devolve.
export function EnganarMorte() {
  const { personagem, souMestre, salvar } = useFicha();
  const [confirmando, setConfirmando] = useState(false);
  const usado = personagem.enganou_morte;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <Skull className={cn("size-6", usado ? "text-muted-foreground/50" : "text-ouro")} aria-hidden />
      <p className={cn("flex-1 text-lg", usado && "text-muted-foreground line-through")}>Engana a morte 1 vez.</p>
      {usado ? (
        souMestre ? (
          <Button variant="outline" size="lg" onClick={() => salvar({ enganou_morte: false })}>
            Devolver o uso
          </Button>
        ) : (
          <span className="text-base text-muted-foreground">Já usado</span>
        )
      ) : confirmando ? (
        <Button
          variant="destructive"
          size="lg"
          onClick={() => {
            setConfirmando(false);
            void salvar({ enganou_morte: true });
          }}
          onBlur={() => setConfirmando(false)}
        >
          Confirmar: usei
        </Button>
      ) : (
        <Button variant="outline" size="lg" onClick={() => setConfirmando(true)}>
          Usar
        </Button>
      )}
    </div>
  );
}
