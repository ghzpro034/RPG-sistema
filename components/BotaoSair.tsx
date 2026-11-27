"use client";

import { sair } from "@/app/actions";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Ao sair, apaga as imagens do RPG guardadas no aparelho (public/sw.js), para o próximo a usar não vê-las.
export function BotaoSair() {
  return (
    <form
      action={sair}
      onSubmit={() => {
        if ("caches" in window) caches.delete("asm-imagens-v1").catch(() => {});
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="h-11 min-w-11 sm:h-8 sm:min-w-0">
        <LogOut className="sm:hidden" aria-hidden />
        <span className="sr-only sm:not-sr-only">Sair</span>
      </Button>
    </form>
  );
}
