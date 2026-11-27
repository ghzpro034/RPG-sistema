"use client";

import { ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NOME_GRUPO, type EstadoCombate } from "@/lib/combate";
import { createClient } from "@/lib/supabase/client";

// Mestre: começa e encerra o combate, vê a ordem (Inimigo → A → Inimigo → B…) e passa a vez.
export function PainelCombate({
  campanhaId,
  estado,
  erro,
  aoMudar,
}: {
  campanhaId: string;
  estado: EstadoCombate | null;
  /** a leitura do combate falhou: mostra o aviso em vez de "Começar combate" */
  erro: boolean;
  aoMudar: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [ocupado, setOcupado] = useState(false);
  // "Encerrar" pede um segundo toque; o pedido some sozinho
  const [encerrando, setEncerrando] = useState(false);
  const semGrupos = !estado?.sequencia.length;

  useEffect(() => {
    if (!encerrando) return;
    const espera = setTimeout(() => setEncerrando(false), 4000);
    return () => clearTimeout(espera);
  }, [encerrando]);

  async function chamar(rpc: string, args: Record<string, unknown>) {
    setOcupado(true);
    const { error } = await supabase.rpc(rpc, { p_campanha: campanhaId, ...args });
    setOcupado(false);
    if (error) return toast.error(error.message);
    await aoMudar();
  }

  // sem conseguir ler o combate, não oferece "Começar" (o mestre poderia achar que caiu e recomeçar)
  if (erro && !estado) {
    return (
      <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-instavel/40 bg-instavel/10 p-4">
        <p className="text-base">Não consegui ler o combate desta mesa. Confira a internet.</p>
        <Button variant="outline" size="lg" onClick={() => void aoMudar()}>
          Tentar de novo
        </Button>
      </section>
    );
  }
  if (!estado) {
    return <p className="text-base text-muted-foreground" role="status">Carregando o combate…</p>;
  }

  if (!estado.em_combate) {
    return (
      <section className="moldura-carta flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 text-white/40">
        <div className="text-foreground">
          <h2 className="flex items-center gap-2 text-xl">
            <Swords className="size-5 text-instavel" aria-hidden /> Combate
          </h2>
          <p className="text-base text-muted-foreground">
            {semGrupos
              ? "Coloque cada personagem no Grupo A ou B (nos cards) e comece."
              : "Grupos prontos. A ordem é Inimigo → A → Inimigo → B."}
          </p>
        </div>
        <Button size="lg" className="font-heading" disabled={ocupado} onClick={() => chamar("definir_combate", { p_ativo: true })}>
          <Swords /> Começar combate
        </Button>
      </section>
    );
  }

  return (
    <section className="moldura-carta flex flex-col gap-3 rounded-xl bg-instavel/5 p-4 text-instavel/60" aria-label="Combate">
      <div className="flex flex-wrap items-center justify-between gap-3 text-foreground">
        <h2 className="flex items-center gap-2 text-2xl">
          <Swords className="size-5 text-instavel" aria-hidden /> Combate
          <span className="font-rotulo text-sm tracking-[0.2em] text-muted-foreground uppercase">Rodada {estado.rodada}</span>
        </h2>
        {encerrando ? (
          <Button
            variant="destructive"
            size="lg"
            autoFocus
            disabled={ocupado}
            onClick={() => {
              setEncerrando(false);
              void chamar("definir_combate", { p_ativo: false });
            }}
          >
            Encerrar mesmo
          </Button>
        ) : (
          <Button variant="ghost" size="lg" disabled={ocupado} onClick={() => setEncerrando(true)}>
            Encerrar
          </Button>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-base text-instavel">A conexão falhou; mostrando o último estado que chegou.</p>
      )}
      {semGrupos ? (
        <p className="text-base text-foreground">Ninguém nos grupos ainda: use os botões A e B nos cards.</p>
      ) : (
        <ol className="flex flex-wrap gap-1.5 text-foreground" aria-label="Ordem do combate">
          {estado.sequencia.map((passo) => {
            const atual = passo.posicao === estado.vez;
            return (
              <li
                key={passo.posicao}
                aria-current={atual ? "step" : undefined}
                className={cn(
                  "rounded-full border px-3 py-1 text-base",
                  atual ? "border-ouro bg-ouro text-primary-foreground" : "border-border text-muted-foreground",
                  !passo.personagem_id && !atual && "border-instavel/40 text-instavel/80",
                )}
              >
                {passo.personagem_id ? passo.nome : "Inimigo"}
                <span className="ml-1 font-rotulo text-[0.65rem] tracking-widest uppercase opacity-70">
                  {NOME_GRUPO[passo.grupo].replace("Grupo ", "")}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex gap-2 text-foreground">
        <Button
          variant="outline"
          size="lg"
          className="h-12"
          disabled={ocupado || semGrupos}
          onClick={() => chamar("avancar_vez", { p_passos: -1 })}
          aria-label="Voltar uma vez"
        >
          <ChevronLeft />
        </Button>
        <Button
          size="lg"
          className="h-12 flex-1 font-heading text-lg"
          disabled={ocupado || semGrupos}
          onClick={() => chamar("avancar_vez", { p_passos: 1 })}
        >
          Próximo <ChevronRight />
        </Button>
      </div>
    </section>
  );
}
