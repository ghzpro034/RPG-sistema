"use client";

import { Star, Trash2 } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Contador } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { COLUNA_ESPACOS, RARIDADES, type ItemInventario, type Raridade } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

// o lucide não tem dente; este é o ícone da moeda
function Dente({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.4 1.4 5 .6 1.7.8 3.6 1.2 5.6.4 2 1 2.9 1.9 2.9 1.2 0 1.5-1.6 1.9-3.6.3-1.6.8-3 2.6-3s2.3 1.4 2.6 3c.4 2 .7 3.6 1.9 3.6.9 0 1.5-.9 1.9-2.9.4-2 .6-3.9 1.2-5.6.6-1.6 1.4-3 1.4-5C21 5 19.5 3 17 3c-2 0-3 1.2-5 1.2S9 3 7 3Z" />
    </svg>
  );
}

// As estrelas ★ da ficha do Canva: o nível de memória da arma (acesas = memórias desbloqueadas).
export function Estrelas({ total, acesas, className }: { total: number; acesas: number; className?: string }) {
  if (total <= 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${acesas} de ${total} memórias desbloqueadas`}>
      {Array.from({ length: total }, (_, n) => (
        <Star key={n} className={cn("size-4", n < acesas ? "fill-ouro text-ouro" : "text-white/30")} aria-hidden />
      ))}
    </span>
  );
}

export function Inventario({ inicial }: { inicial: ItemInventario[] }) {
  const { personagem, editando, setStatus, salvarDepois, morto, souMestre } = useFicha();
  const dentes = personagem.dentes ?? 0;
  const supabase = useMemo(() => createClient(), []);
  const [itens, setItens] = useState(inicial);
  const confirmados = useRef(inicial);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // os espaços de cada raridade são da ficha; só o mestre muda
  const editaEspacos = editando && souMestre;

  useEffect(() => {
    const pendentes = timers.current;
    return () => pendentes.forEach(clearTimeout);
  }, []);

  function voltarAtras(mensagem: string) {
    toast.error(mensagem);
    setItens(confirmados.current);
    setStatus("erro");
  }

  // espera os cliques seguidos em − e + antes de salvar
  function mudarQuantidade(id: string, quantidade: number) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, quantidade } : i)));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(async () => {
        setStatus("salvando");
        const { error } = await supabase.from("inventario").update({ quantidade }).eq("id", id);
        if (error) return voltarAtras(error.message);
        confirmados.current = confirmados.current.map((i) => (i.id === id ? { ...i, quantidade } : i));
        setStatus("salvo");
      }, 500),
    );
  }

  async function remover(id: string) {
    setConfirmando(null);
    setItens((lista) => lista.filter((i) => i.id !== id));
    setStatus("salvando");
    const { error } = await supabase.from("inventario").delete().eq("id", id);
    if (error) return voltarAtras(error.message);
    confirmados.current = confirmados.current.filter((i) => i.id !== id);
    setStatus("salvo");
    toast.success("Item removido");
  }

  const total = RARIDADES.reduce((n, r) => n + personagem[COLUNA_ESPACOS[r.valor]], 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {itens.length} de {total} espaços ocupados. Itens novos vêm do mestre.
        </p>
        {/* dentes: a moeda do RPG */}
        <div className="flex items-center gap-2 rounded-full border border-white/40 py-1 pr-1 pl-4">
          {editando ? (
            <Contador rotulo="dentes" valor={dentes} aoMudar={(d) => salvarDepois({ dentes: d })} />
          ) : (
            <span className="font-heading text-2xl tabular-nums">{dentes}</span>
          )}
          <span className="flex size-10 items-center justify-center rounded-full border-2 border-white/70 bg-black">
            <Dente className="size-6" />
          </span>
          <span className="pr-3 font-rotulo text-xs tracking-[0.2em] text-muted-foreground uppercase">Dentes</span>
        </div>
      </div>

      {/* um bloco por raridade, como na ficha física: os itens e os espaços vazios tracejados */}
      {RARIDADES.map((raridade) => {
        const coluna = COLUNA_ESPACOS[raridade.valor];
        const espacos = personagem[coluna];
        const daRaridade = itens.filter((i) => i.item.raridade === raridade.valor);
        const vazios = Math.max(0, espacos - daRaridade.length);
        if (!espacos && !daRaridade.length && !editaEspacos) return null;
        return (
          <section key={raridade.valor} className="flex flex-col gap-2" aria-label={`Itens ${raridade.nome}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className={cn("flex items-center gap-2 font-rotulo text-sm tracking-[0.25em] uppercase", raridade.cor)}>
                <span className={cn("size-3 rounded-full", raridade.fundo)} aria-hidden />
                {raridade.nome}
              </h3>
              {editaEspacos ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  espaços
                  <Contador
                    rotulo={`espaços ${raridade.nome}`}
                    valor={espacos}
                    max={20}
                    aoMudar={(n) => salvarDepois({ [coluna]: n })}
                  />
                </span>
              ) : (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {daRaridade.length}/{espacos}
                </span>
              )}
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
              {daRaridade.map(({ id, quantidade, memorias_desbloqueadas, item }) => (
                <li
                  key={id}
                  className={cn(
                    "moldura-carta flex flex-col gap-3 rounded-xl bg-card p-4 text-white/40",
                    quantidade === 0 && "opacity-60",
                  )}
                >
                  <div className="flex gap-3 text-foreground">
                    <div className={cn("size-20 shrink-0 overflow-hidden rounded-md border-2 bg-secondary", raridade.borda)}>
                      {item.imagemUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                        <img src={item.imagemUrl} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={cn("text-xl leading-tight break-words", raridade.cor)} title={raridade.nome}>
                        {item.nome}
                      </h4>
                      {/* o dano em destaque, como "D10 de DANO" na ficha */}
                      {item.dano && (
                        <p className="text-lg font-bold text-instavel tabular-nums">
                          {item.dano} <span className="font-rotulo text-xs tracking-[0.2em] uppercase">de dano</span>
                        </p>
                      )}
                      {item.efeito && <p className="font-heading text-base text-ouro">{item.efeito}</p>}
                      <Estrelas total={item.max_memorias} acesas={memorias_desbloqueadas} className="mt-1" />
                    </div>
                  </div>
                  {item.descricao && <p className="text-base leading-snug text-muted-foreground">{item.descricao}</p>}
                  {item.criador && (
                    <p className="font-rotulo text-xs tracking-[0.2em] text-muted-foreground uppercase">
                      Criado por <span className="text-foreground">{item.criador}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-foreground">
                    <Contador
                      rotulo={`quantidade de ${item.nome}`}
                      valor={quantidade}
                      desabilitado={morto}
                      aoMudar={(q) => mudarQuantidade(id, q)}
                    />
                    {/* o mestre remove direto; o player só no modo edição */}
                    {(editando || (souMestre && !morto)) &&
                      (confirmando === id ? (
                        <Button variant="destructive" size="lg" className="h-11" onClick={() => remover(id)} onBlur={() => setConfirmando(null)}>
                          Remover mesmo
                        </Button>
                      ) : (
                        <Button variant="ghost" size="lg" className="h-11" onClick={() => setConfirmando(id)} aria-label={`Remover ${item.nome}`}>
                          <Trash2 /> Remover
                        </Button>
                      ))}
                  </div>
                </li>
              ))}
              {Array.from({ length: vazios }, (_, n) => (
                <li
                  key={`vazio-${n}`}
                  className={cn(
                    "flex min-h-24 items-center justify-center rounded-xl border-2 border-dashed text-base text-muted-foreground/60",
                    raridade.borda,
                  )}
                >
                  Espaço {raridade.nome.toLowerCase()} vazio
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export type { Raridade };
