"use client";

import { Lock } from "lucide-react";
import { useFicha } from "@/components/ficha/contexto";
import { Switch } from "@/components/ui/switch";
import type { Travas as TipoTravas } from "@/lib/ficha-tipos";

const TRAVAS: { chave: keyof TipoTravas; rotulo: string }[] = [
  { chave: "atributos", rotulo: "Atributos travados" },
  { chave: "vida_max", rotulo: "Vida máx. travada" },
  { chave: "pe", rotulo: "PE travado" },
];

// Só o mestre vê: decide o que o player pode mexer na própria ficha.
export function Travas() {
  const { personagem, salvar } = useFicha();
  const travas = personagem.travas ?? {};

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-ouro/30 bg-ouro/5 p-4">
      <h2 className="flex items-center gap-2 font-heading text-sm tracking-[0.2em] text-ouro uppercase">
        <Lock className="size-4" /> Travas do mestre
      </h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {TRAVAS.map(({ chave, rotulo }) => (
          <label key={chave} className="flex min-h-11 cursor-pointer items-center gap-3 text-lg">
            <Switch
              checked={travas[chave] !== false}
              onCheckedChange={(ligada) => salvar({ travas: { ...travas, [chave]: ligada } })}
            />
            {rotulo}
          </label>
        ))}
      </div>
    </section>
  );
}
