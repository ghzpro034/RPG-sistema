"use client";

import { Crosshair, Shield, Swords, Zap } from "lucide-react";
import { cn } from "cn";
import { useCombate } from "@/components/combate";
import { useFicha } from "@/components/ficha/contexto";
import { useRolador } from "@/components/ficha/rolador";
import { Button } from "@/components/ui/button";
import { NOME_GRUPO, passoAtual } from "@/lib/combate";
import type { Atributo } from "@/lib/ficha-tipos";

// Aparece na ficha só durante o combate da mesa: o grupo, de quem é a vez e as ações de combate.
export function Combate({ campanhaAtual, atributos }: { campanhaAtual: string; atributos: Atributo[] }) {
  const { personagem, morto, editando } = useFicha();
  const { estado } = useCombate(campanhaAtual);
  const { rolarTiro, rolarD20, recuperarFoco, rolando } = useRolador();
  if (!estado?.em_combate || morto) return null;

  const grupo = estado.grupos[personagem.id];
  const passo = passoAtual(estado);
  const minhaVez = passo?.personagem_id === personagem.id;
  const resistencia = atributos.find((a) => a.nome === "Resistência");
  const semAcao = rolando || editando;

  return (
    <section
      className={cn(
        "moldura-carta flex flex-col gap-4 rounded-xl p-4 transition-colors",
        minhaVez ? "bg-ouro/10 text-ouro" : "bg-card text-white/40",
      )}
      aria-label="Combate"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-foreground">
        <h2 className="flex items-center gap-2 text-2xl">
          <Swords className="size-5 text-instavel" aria-hidden /> Combate
          <span className="font-rotulo text-sm tracking-[0.2em] text-muted-foreground uppercase">Rodada {estado.rodada}</span>
        </h2>
        <span className="font-rotulo text-sm tracking-[0.2em] uppercase">
          {grupo ? NOME_GRUPO[grupo] : <span className="text-muted-foreground">Fora dos grupos</span>}
        </span>
      </div>

      {/* de quem é a vez, em letra grande quando é a sua */}
      <p role="status" aria-live="polite" className={cn("text-foreground", minhaVez ? "text-2xl text-ouro" : "text-lg")}>
        {minhaVez ? (
          <span className="font-heading">É a sua vez! 1 ação principal e 1 secundária.</span>
        ) : passo ? (
          <>
            Vez {passo.personagem_id ? "de " : "do "}
            <b className={passo.personagem_id ? "" : "text-instavel"}>{passo.personagem_id ? passo.nome : "inimigo"}</b>
          </>
        ) : (
          <span className="text-muted-foreground">O mestre ainda não montou os grupos.</span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2 text-foreground sm:grid-cols-4">
        <Button variant="outline" size="lg" className="h-12" disabled={semAcao} onClick={() => rolarTiro(false)}>
          <Crosshair /> Atirar D8
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12"
          disabled={semAcao}
          onClick={() => rolarTiro(true)}
          title="Atirador focado ou arma avançada: sem chance de erro"
        >
          <Crosshair /> Atirar D6
        </Button>
        {resistencia && (
          <Button
            variant="outline"
            size="lg"
            className="h-12"
            disabled={semAcao}
            onClick={() => rolarD20(resistencia.id)}
            title="Reação: D20 de Resistência. Passou: o dano cai pela metade"
          >
            <Shield /> Defender
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="h-12"
          disabled={semAcao || personagem.pe >= personagem.pe_max}
          onClick={recuperarFoco}
          title="+2 PE. Fica vulnerável (sem redução de dano) e sem ação secundária até o próximo turno"
        >
          <Zap /> Recuperar Foco
        </Button>
      </div>
      <p className="text-base leading-snug text-muted-foreground">
        Defender rola o D20 de Resistência. Recuperar Foco dá +2 PE, mas deixa vulnerável até o próximo turno.
      </p>
    </section>
  );
}
