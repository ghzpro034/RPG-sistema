"use client";

import { Flag, HeartPulse, Minus, Plus, Snowflake } from "lucide-react";
import { cn } from "cn";
import { Contador, Travado } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { corDoEstado, estadoDe, fundoDoEstado, type Estado } from "@/lib/estado";
import { LIMITE_CONGELADO } from "@/lib/ficha-tipos";

const LEGENDA: { estado: Estado; limite: (vidaMax: number) => string }[] = [
  { estado: "Estável", limite: (vidaMax) => `até ${vidaMax}` },
  { estado: "Ferido", limite: () => "menos de 10" },
  { estado: "Instável", limite: () => "menos de 5" },
];

function Rotulo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-heading text-xs tracking-[0.25em] uppercase", className)}>{children}</span>
  );
}

// Coluna da esquerda da ficha: vida, estado, corrupção e congelado.
export function Vitais() {
  const { personagem: p, editando, travado, salvarDepois } = useFicha();
  const estado = estadoDe(p.vida);
  const porcentagem = Math.max(0, Math.min(100, (p.vida / p.vida_max) * 100));
  const vidaMaxTravada = travado("vida_max");
  const congelado = p.congelado;
  const congelou = congelado > LIMITE_CONGELADO;

  return (
    <section className="grid gap-5 sm:grid-cols-2">
      {/* Vida: − e + sempre à mão, é o que mais muda durante a sessão */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-sangue bg-sangue/50 shadow-[0_0_24px] shadow-sangue/40">
            <HeartPulse className="size-10 text-pergaminho" aria-hidden />
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="size-11"
                aria-label="Diminuir vida"
                disabled={p.vida <= 0}
                onClick={() => salvarDepois({ vida: p.vida - 1 })}
              >
                <Minus />
              </Button>
              <span
                className="min-w-24 rounded-full bg-sangue px-4 py-1 text-center font-heading text-2xl tabular-nums"
                aria-live="polite"
              >
                {p.vida}/{p.vida_max}
              </span>
              <Button
                variant="outline"
                className="size-11"
                aria-label="Aumentar vida"
                disabled={p.vida >= p.vida_max}
                onClick={() => salvarDepois({ vida: p.vida + 1 })}
              >
                <Plus />
              </Button>
            </div>
            {/* congelamento: o círculo cinza logo abaixo da vida, como no Canva */}
            <div className="flex items-center gap-3">
              {editando ? (
                <Contador rotulo="congelamento" valor={congelado} aoMudar={(c) => salvarDepois({ congelado: c })} />
              ) : (
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 font-heading text-lg tabular-nums",
                    congelou ? "border-congelado bg-congelado/30 text-white" : "border-white/30 bg-secondary",
                  )}
                  aria-label={`Congelamento ${congelado}`}
                >
                  {congelado}
                </span>
              )}
              <span className={cn("font-heading text-lg tracking-wider", corDoEstado[estado])}>{estado}</span>
            </div>
          </div>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Vida"
          aria-valuenow={p.vida}
          aria-valuemin={0}
          aria-valuemax={p.vida_max}
        >
          <div className={cn("h-full transition-all", fundoDoEstado[estado])} style={{ width: `${porcentagem}%` }} />
        </div>
        {editando &&
          (vidaMaxTravada ? (
            <Travado />
          ) : (
            <div className="flex items-center gap-3">
              <Rotulo className="text-muted-foreground">Vida máx.</Rotulo>
              <Contador rotulo="vida máxima" valor={p.vida_max} min={1} aoMudar={(vida_max) => salvarDepois({ vida_max })} />
            </div>
          ))}
      </div>

      {/* Estados, com o atual em destaque */}
      <ul className="flex flex-col gap-1.5" aria-label="Estados">
        {LEGENDA.map(({ estado: e, limite }) => (
          <li
            key={e}
            className={cn("flex items-center gap-3 transition-opacity", e === estado ? "opacity-100" : "opacity-35")}
            aria-current={e === estado ? "true" : undefined}
          >
            <Flag className={cn("size-6 fill-current", corDoEstado[e])} aria-hidden />
            <span className={cn("w-24 font-heading text-lg", corDoEstado[e])}>{e}</span>
            <span className="text-base text-muted-foreground">{limite(p.vida_max)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
        <div className="flex items-center gap-3">
          <Rotulo className="text-corrupcao">Corrupção</Rotulo>
          {editando ? (
            <Contador rotulo="corrupção" valor={p.corrupcao} aoMudar={(corrupcao) => salvarDepois({ corrupcao })} />
          ) : (
            <span className="font-heading text-3xl text-corrupcao tabular-nums">{p.corrupcao}</span>
          )}
        </div>

        {/* a regra do frio; acende quando o congelamento passa do limite */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role={congelou ? "status" : undefined}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1.5 whitespace-nowrap text-congelado transition-colors",
              congelou ? "border-congelado bg-congelado/20" : "border-congelado/40",
            )}
          >
            <Snowflake className={cn("size-4", congelou && "animate-pulse")} aria-hidden />
            <Rotulo>Congelado</Rotulo>
            <span className="text-sm">mais do que</span>
            <span className="font-heading text-xl">{LIMITE_CONGELADO}</span>
          </div>
          {congelou && (
            <span className="font-heading text-sm font-bold tracking-wider text-congelado uppercase">
              Congelou no frio!
            </span>
          )}
        </div>

        {/* a defesa aparece no escudo do retrato; aqui só para editar */}
        {editando && (
          <div className="flex items-center gap-3">
            <Rotulo className="text-muted-foreground">Defesa</Rotulo>
            <Contador rotulo="defesa" valor={p.defesa} aoMudar={(defesa) => salvarDepois({ defesa })} />
          </div>
        )}
      </div>
    </section>
  );
}
