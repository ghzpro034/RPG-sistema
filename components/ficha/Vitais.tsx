"use client";

import { Flag, HeartPulse, Minus, Plus, Snowflake, Sparkles } from "lucide-react";
import { cn } from "cn";
import { Contador, Travado } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { EFEITO_DO_ESTADO, corDoEstado, estadoDe, fundoDoEstado, metadeDaVida, type Estado } from "@/lib/estado";
import type { Personagem } from "@/lib/ficha-tipos";

// Compêndio: Ferido abaixo de 50% da vida; o limiar de Instável é de cada ficha; Morrendo em 0.
const LEGENDA: { estado: Estado; limite: (p: Personagem) => string }[] = [
  { estado: "Estável", limite: (p) => `${metadeDaVida(p.vida_max)} ou mais` },
  { estado: "Ferido", limite: (p) => `menos de ${metadeDaVida(p.vida_max)}` },
  { estado: "Instável", limite: (p) => `menos de ${p.limiar_instavel}` },
  { estado: "Morrendo", limite: () => "0" },
];

function Rotulo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-rotulo text-xs tracking-[0.25em] uppercase", className)}>{children}</span>
  );
}

// Coluna da esquerda da ficha: vida, estado, corrupção e congelado.
export function Vitais() {
  const { personagem: p, editando, travado, salvarDepois, morto, souMestre } = useFicha();
  const estado = estadoDe(p.vida, p.vida_max, p.limiar_instavel);
  // limites do estado e do frio: só o mestre mexe
  const editaLimites = editando && souMestre;
  const porcentagem = Math.max(0, Math.min(100, (p.vida / p.vida_max) * 100));
  const vidaMaxTravada = travado("vida_max");
  const congelado = p.congelado;
  const congelou = congelado > p.limite_congelado;

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
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
                disabled={morto || p.vida <= 0}
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
                disabled={morto || p.vida >= p.vida_max}
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
                    "flex h-10 items-center gap-1 rounded-full border-2 px-3 font-heading text-lg tabular-nums",
                    congelou ? "border-congelado bg-congelado/30 text-white" : "border-white/30 bg-secondary",
                  )}
                  aria-label={`Congelamento ${congelado}`}
                  title="Congelamento"
                >
                  <Snowflake className="size-4 text-congelado" aria-hidden />
                  {congelado}
                </span>
              )}
              <span className={cn("font-heading text-lg", corDoEstado[estado])}>{estado}</span>
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

      {/* Estados, com o atual em destaque e o que ele impõe */}
      <div className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1.5" aria-label="Estados">
          {LEGENDA.map(({ estado: e, limite }) => (
            <li
              key={e}
              className={cn("flex items-center gap-3 transition-opacity", e === estado ? "opacity-100" : "opacity-35")}
              aria-current={e === estado ? "true" : undefined}
            >
              <Flag className={cn("size-6 fill-current", corDoEstado[e])} aria-hidden />
              <span className={cn("w-28 font-heading text-lg", corDoEstado[e])}>{e}</span>
              <span className="text-base text-muted-foreground">{limite(p)}</span>
            </li>
          ))}
        </ul>
        {/* o limiar de Instável é de cada ficha; só o mestre muda */}
        {editaLimites && (
          <div className="flex items-center gap-3">
            <Rotulo className="text-instavel">Instável abaixo de</Rotulo>
            <Contador
              rotulo="limiar de Instável"
              valor={p.limiar_instavel}
              max={p.vida_max}
              aoMudar={(limiar_instavel) => salvarDepois({ limiar_instavel })}
            />
          </div>
        )}
        <p className={cn("text-base leading-snug", corDoEstado[estado])}>{EFEITO_DO_ESTADO[estado]}</p>
      </div>

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
              "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-3xl border px-4 py-1.5 text-congelado transition-colors",
              congelou ? "border-congelado bg-congelado/20" : "border-congelado/40",
            )}
          >
            <Snowflake className={cn("size-4", congelou && "animate-pulse")} aria-hidden />
            <Rotulo>Congelado</Rotulo>
            <span className="text-sm">mais do que</span>
            {editaLimites ? (
              <Contador
                rotulo="limite de congelamento"
                valor={p.limite_congelado}
                aoMudar={(limite_congelado) => salvarDepois({ limite_congelado })}
              />
            ) : (
              <span className="font-heading text-xl">{p.limite_congelado}</span>
            )}
          </div>
          {congelou && (
            <span className="font-rotulo text-sm font-bold tracking-wider text-congelado uppercase">
              Congelou no frio!
            </span>
          )}
        </div>

        {/* Sinergia muda no meio do combate: − e + sempre à mão */}
        <div className="flex items-center gap-3">
          <Rotulo className="flex items-center gap-1.5 text-mental">
            <Sparkles className="size-4" aria-hidden /> Sinergia
          </Rotulo>
          <Contador
            rotulo="pontos de sinergia"
            valor={p.sinergia}
            desabilitado={morto}
            aoMudar={(sinergia) => salvarDepois({ sinergia })}
          />
        </div>

        {/* a proteção (armadura) aparece no escudo do retrato; aqui só para editar */}
        {editando && (
          <div className="flex items-center gap-3">
            <Rotulo className="text-muted-foreground">Proteção</Rotulo>
            <Contador rotulo="pontos de proteção" valor={p.defesa} aoMudar={(defesa) => salvarDepois({ defesa })} />
          </div>
        )}
      </div>
    </section>
  );
}
