"use client";

import { sair } from "@/app/actions";
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
      <Button type="submit" variant="ghost" size="sm" className="h-10 sm:h-8">
        Sair
      </Button>
    </form>
  );
}
