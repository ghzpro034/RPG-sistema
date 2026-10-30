"use client";

import { Trash2 } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Contador } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { ESPACOS_INVENTARIO, type ItemInventario, type Raridade } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

// cores da ficha do Canva: comum branco, incomum azul, único roxo
const RARIDADE: Record<Raridade, { rotulo: string; texto: string; fundo: string }> = {
  comum: { rotulo: "Comum", texto: "text-comum", fundo: "bg-comum" },
  incomum: { rotulo: "Incomum", texto: "text-incomum", fundo: "bg-incomum" },
  unico: { rotulo: "Único", texto: "text-unico", fundo: "bg-unico" },
};

const ROMANOS = ["I", "II", "III", "IV", "V"];

// o lucide não tem dente; este é o ícone da moeda
function Dente({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 3c-2.5 0-4 2-4 4.5 0 2 .8 3.4 1.4 5 .6 1.7.8 3.6 1.2 5.6.4 2 1 2.9 1.9 2.9 1.2 0 1.5-1.6 1.9-3.6.3-1.6.8-3 2.6-3s2.3 1.4 2.6 3c.4 2 .7 3.6 1.9 3.6.9 0 1.5-.9 1.9-2.9.4-2 .6-3.9 1.2-5.6.6-1.6 1.4-3 1.4-5C21 5 19.5 3 17 3c-2 0-3 1.2-5 1.2S9 3 7 3Z" />
    </svg>
  );
}

export function Inventario({ inicial }: { inicial: ItemInventario[] }) {
  const { personagem, editando, setStatus, salvarDepois, morto } = useFicha();
  const dentes = personagem.dentes ?? 0;
  const supabase = useMemo(() => createClient(), []);
  const [itens, setItens] = useState(inicial);
  const confirmados = useRef(inicial);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [confirmando, setConfirmando] = useState<string | null>(null);

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

  const vazios = Math.max(0, ESPACOS_INVENTARIO - itens.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {itens.length} de {ESPACOS_INVENTARIO} espaços ocupados. Itens novos vêm do mestre.
        </p>
        {/* dentes: a moeda do RPG */}
        <div className="flex items-center gap-2 rounded-full border border-white/40 py-1 pr-1 pl-4">
          {editando ? (
            <Contador rotulo="dentes" valor={dentes} aoMudar={(d) => salvarDepois({ dentes: d })} />
          ) : (
            <span className="font-heading text-2xl italic tabular-nums">{dentes}</span>
          )}
          <span className="flex size-10 items-center justify-center rounded-full border-2 border-white/70 bg-black">
            <Dente className="size-6" />
          </span>
          <span className="sr-only">dentes</span>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {itens.map(({ id, quantidade, memorias_desbloqueadas, item }) => (
          <li
            key={id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
              quantidade === 0 && "opacity-60",
            )}
          >
            <div className="flex gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                {item.imagemUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                  <img src={item.imagemUrl} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={cn("text-lg font-bold tracking-wide break-words uppercase", RARIDADE[item.raridade].texto)}
                  title={RARIDADE[item.raridade].rotulo}
                >
                  {item.nome}
                </h3>
                {item.efeito && <p className="font-heading text-base font-bold text-instavel">{item.efeito}</p>}
              </div>
            </div>
            {item.descricao && <p className="text-base leading-snug text-muted-foreground">{item.descricao}</p>}
            {item.max_memorias > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Memórias
                {Array.from({ length: item.max_memorias }, (_, n) => (
                  <span
                    key={n}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border font-heading text-xs",
                      n < memorias_desbloqueadas ? "border-incomum bg-incomum/30 text-white" : "border-border text-muted-foreground/50",
                    )}
                  >
                    {ROMANOS[n] ?? n + 1}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <Contador
                rotulo={`quantidade de ${item.nome}`}
                valor={quantidade}
                desabilitado={morto}
                aoMudar={(q) => mudarQuantidade(id, q)}
              />
              {editando &&
                (confirmando === id ? (
                  <Button variant="destructive" size="lg" onClick={() => remover(id)} onBlur={() => setConfirmando(null)}>
                    Confirmar
                  </Button>
                ) : (
                  <Button variant="ghost" size="lg" onClick={() => setConfirmando(id)} aria-label={`Remover ${item.nome}`}>
                    <Trash2 /> Remover
                  </Button>
                ))}
            </div>
          </li>
        ))}
        {Array.from({ length: vazios }, (_, n) => (
          <li
            key={`vazio-${n}`}
            className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border text-base text-muted-foreground/60"
          >
            Espaço vazio
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2" aria-label="Raridades">
        {Object.values(RARIDADE).map(({ rotulo, texto, fundo }) => (
          <li key={rotulo} className={cn("flex items-center gap-2 font-heading text-sm tracking-[0.2em] uppercase", texto)}>
            <span className={cn("size-5 rounded-full", fundo)} aria-hidden />
            {rotulo}
          </li>
        ))}
      </ul>
    </div>
  );
}
