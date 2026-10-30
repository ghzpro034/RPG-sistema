"use client";

import { cn } from "cn";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Contador, Travado } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { Input } from "@/components/ui/input";
import type { Atributo, Grupo } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

const GRUPOS: { grupo: Grupo; titulo: string; texto: string; circulo: string }[] = [
  { grupo: "forca", titulo: "Força", texto: "text-forca", circulo: "bg-forca" },
  { grupo: "mental", titulo: "Mental", texto: "text-mental", circulo: "bg-mental" },
  { grupo: "social", titulo: "Social", texto: "text-social", circulo: "bg-social" },
];

// O PE no losango dourado, ao lado da rolagem, como na ficha do Canva.
function LosangoPE() {
  const { personagem: p, editando, travado, salvarDepois } = useFicha();
  const peTravado = travado("pe");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {/* o quadrado girado ocupa a diagonal (~1,41×); a moldura reserva esse espaço */}
        <div className="flex size-24 items-center justify-center">
          <div className="flex size-16 rotate-45 items-center justify-center bg-ouro shadow-[0_0_20px] shadow-ouro/30">
            <span className="-rotate-45 font-heading text-2xl font-bold text-primary-foreground tabular-nums">
              {p.pe}
            </span>
          </div>
        </div>
        <div className="flex flex-col text-base leading-tight">
          <span className="font-heading text-xl">
            PE <span className="text-base text-muted-foreground">/ {p.pe_max}</span>
          </span>
          <span className="text-muted-foreground">Reforçar −1</span>
          <span className="text-muted-foreground">Refazer −2</span>
        </div>
      </div>
      {editando &&
        (peTravado ? (
          <Travado />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <Contador rotulo="PE" valor={p.pe} max={p.pe_max} aoMudar={(pe) => salvarDepois({ pe })} />
            máx.
            <Contador rotulo="PE máximo" valor={p.pe_max} min={1} aoMudar={(pe_max) => salvarDepois({ pe_max })} />
          </div>
        ))}
    </div>
  );
}

export function Atributos({ inicial }: { inicial: Atributo[] }) {
  const { editando, travado, setStatus } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const [atributos, setAtributos] = useState(inicial);
  const confirmados = useRef(inicial);
  const podeEditar = editando && !travado("atributos");

  async function salvarValor(id: string, texto: string) {
    const valor = Math.max(0, Math.min(100, Math.round(Number(texto))));
    const atual = atributos.find((a) => a.id === id);
    if (!atual || Number.isNaN(valor) || valor === atual.valor) return;

    setAtributos((lista) => lista.map((a) => (a.id === id ? { ...a, valor } : a)));
    setStatus("salvando");
    const { error } = await supabase.from("atributos").update({ valor }).eq("id", id);
    if (error) {
      toast.error(error.message);
      setAtributos(confirmados.current);
      setStatus("erro");
      return;
    }
    confirmados.current = confirmados.current.map((a) => (a.id === id ? { ...a, valor } : a));
    setStatus("salvo");
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl tracking-wide">Jogue um D100</h2>
          <p className="text-lg text-muted-foreground">Para realizar uma ação tire menos que:</p>
          {editando && travado("atributos") && <Travado className="mt-1" />}
        </div>
        <LosangoPE />
      </div>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
        {GRUPOS.map(({ grupo, titulo, texto, circulo }) => (
          <div key={grupo}>
            <h3 className={cn("mb-2 text-base tracking-[0.2em] uppercase", texto)}>{titulo}</h3>
            <ul className="flex flex-col gap-1">
              {atributos
                .filter((a) => a.grupo === grupo)
                .map((a) => (
                  <li key={a.id} className="flex min-h-10 items-center gap-3">
                    {podeEditar ? (
                      <Input
                        key={a.valor}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        defaultValue={a.valor}
                        aria-label={a.nome}
                        onBlur={(e) => salvarValor(a.id, e.currentTarget.value)}
                        className="h-9 w-16 text-center font-heading text-lg md:text-lg"
                      />
                    ) : (
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold text-white tabular-nums",
                          circulo,
                        )}
                      >
                        {a.valor}
                      </span>
                    )}
                    <span className="font-heading text-base tracking-wide uppercase">{a.nome}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
