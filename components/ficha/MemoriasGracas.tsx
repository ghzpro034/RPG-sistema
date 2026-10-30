"use client";

import { Pencil } from "lucide-react";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormaGraca, Graca, ItemInventario, Raridade } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

const ROMANOS = ["I", "II", "III", "IV", "V"];

// Memória I, II e III em losango, pentágono e hexágono, como no Canva.
const FORMAS_MEMORIA = [
  "50,4 96,50 50,96 4,50",
  "50,5 95,38 78,92 22,92 5,38",
  "50,4 90,27 90,73 50,96 10,73 10,27",
  "50,4 85,15 96,50 85,85 50,96 15,85 4,50 15,15",
  "50,4 96,50 50,96 4,50",
];

const COR_RARIDADE: Record<Raridade, string> = {
  comum: "text-comum",
  incomum: "text-incomum",
  unico: "text-unico",
};

const GRACAS: { forma: FormaGraca; rotulo: string; cor: string; desenho: React.ReactNode }[] = [
  { forma: "circulo", rotulo: "Círculo", cor: "text-social", desenho: <circle cx="50" cy="50" r="42" /> },
  { forma: "quadrado", rotulo: "Quadrado", cor: "text-mental", desenho: <rect x="10" y="10" width="80" height="80" /> },
  { forma: "triangulo", rotulo: "Triângulo", cor: "text-instavel", desenho: <polygon points="50,8 94,90 6,90" /> },
  {
    forma: "estrela",
    rotulo: "Estrela",
    cor: "text-white",
    desenho: <polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38" />,
  },
];

function Memorias({
  linha,
  souMestre,
  aoMudar,
}: {
  linha: ItemInventario;
  souMestre: boolean;
  aoMudar: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { item, memorias_desbloqueadas: abertas } = linha;

  // mestre: tocar na próxima memória desbloqueia; tocar na última aberta fecha de novo
  async function alternar(n: number) {
    const novo = n < abertas ? n : n + 1;
    const { error } = await supabase.from("inventario").update({ memorias_desbloqueadas: novo }).eq("id", linha.id);
    if (error) return toast.error(error.message);
    toast.success(novo > abertas ? `Memória ${ROMANOS[n]} desbloqueada` : "Memória fechada");
    await aoMudar();
  }

  return (
    <li className="flex flex-col gap-4 sm:flex-row">
      <div className="flex gap-3 sm:w-64 sm:flex-col">
        <div className="size-24 shrink-0 overflow-hidden rounded-md border-4 border-incomum bg-secondary">
          {item.imagemUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
            <img src={item.imagemUrl} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className={cn("text-xl font-bold tracking-[0.15em] uppercase", COR_RARIDADE[item.raridade])}>{item.nome}</h3>
          {item.descricao && <p className="text-base leading-snug uppercase">{item.descricao}</p>}
          {item.efeito && <p className="mt-1 font-heading text-lg font-bold text-instavel">{item.efeito}</p>}
        </div>
      </div>
      <ol className="flex flex-col gap-1">
        {Array.from({ length: item.max_memorias }, (_, n) => {
          const aberta = n < abertas;
          const clicavel = souMestre && (n === abertas || n === abertas - 1);
          const forma = (
            <svg viewBox="0 0 100 100" className="size-14 shrink-0" aria-hidden>
              <polygon
                points={FORMAS_MEMORIA[n]}
                className={cn("stroke-incomum", aberta ? "fill-incomum" : "fill-transparent opacity-40")}
                strokeWidth={6}
              />
              <text x="50" y="58" textAnchor="middle" className="fill-white font-heading text-[22px] font-bold">
                {ROMANOS[n]}
              </text>
            </svg>
          );
          return (
            <li key={n} className="flex items-center gap-4">
              {clicavel ? (
                <button
                  type="button"
                  onClick={() => alternar(n)}
                  aria-label={aberta ? `Fechar memória ${ROMANOS[n]}` : `Desbloquear memória ${ROMANOS[n]}`}
                  className="rounded-md transition-transform hover:scale-105"
                >
                  {forma}
                </button>
              ) : (
                forma
              )}
              <span className={cn("font-heading text-base tracking-wider uppercase", !aberta && "text-muted-foreground/60")}>
                Memória {ROMANOS[n]}
                {!aberta && " · bloqueada"}
              </span>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

function EditarGraca({
  personagemId,
  forma,
  atual,
  aoFechar,
  aoMudar,
}: {
  personagemId: string;
  forma: FormaGraca;
  atual: Graca | undefined;
  aoFechar: () => void;
  aoMudar: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);

  async function salvar(form: FormData) {
    const dados = {
      nome: String(form.get("nome")).trim() || null,
      descricao: String(form.get("descricao")).trim() || null,
    };
    const { error } = atual
      ? await supabase.from("gracas").update(dados).eq("id", atual.id)
      : await supabase.from("gracas").insert({ ...dados, forma, personagem_id: personagemId });
    if (error) return toast.error(error.message);
    aoFechar();
    await aoMudar();
  }

  async function remover() {
    if (!atual) return;
    const { error } = await supabase.from("gracas").delete().eq("id", atual.id);
    if (error) return toast.error(error.message);
    aoFechar();
    await aoMudar();
  }

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar(new FormData(e.currentTarget));
      }}
    >
      <Input name="nome" defaultValue={atual?.nome ?? ""} placeholder="Nome da graça" className="h-10 text-lg md:text-lg" />
      <Textarea name="descricao" defaultValue={atual?.descricao ?? ""} placeholder="O que ela faz" className="min-h-16 text-lg md:text-lg" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg">{atual ? "Salvar" : "Conceder"}</Button>
        {atual && (
          <Button type="button" variant="destructive" size="lg" onClick={remover}>
            Retirar
          </Button>
        )}
        <Button type="button" variant="ghost" size="lg" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function MemoriasGracas({
  personagemId,
  inventario,
  gracas,
  souMestre,
  aoMudarInventario,
  aoMudarGracas,
}: {
  personagemId: string;
  inventario: ItemInventario[];
  gracas: Graca[];
  souMestre: boolean;
  aoMudarInventario: () => Promise<void>;
  aoMudarGracas: () => Promise<void>;
}) {
  const [editando, setEditando] = useState<FormaGraca | null>(null);
  const comMemorias = inventario.filter((i) => i.item.max_memorias > 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_auto]">
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl tracking-wide">
          Memórias <span className="text-ouro">&amp;</span>
        </h2>
        {comMemorias.length ? (
          <ul className="flex flex-col gap-8">
            {comMemorias.map((linha) => (
              <Memorias key={linha.id} linha={linha} souMestre={souMestre} aoMudar={aoMudarInventario} />
            ))}
          </ul>
        ) : (
          <p className="text-lg text-muted-foreground">Nenhum item com memórias no inventário.</p>
        )}
        {souMestre && comMemorias.length > 0 && (
          <p className="text-base text-muted-foreground">Toque na próxima memória para desbloquear.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl tracking-wide text-ouro">Graças</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-1">
          {GRACAS.map(({ forma, rotulo, cor, desenho }) => {
            const graca = gracas.find((g) => g.forma === forma);
            return (
              <li key={forma} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-start lg:text-left">
                <svg
                  viewBox="0 0 100 100"
                  className={cn("size-16 shrink-0 stroke-current", cor, graca ? "opacity-100" : "opacity-30")}
                  fill="none"
                  strokeWidth={6}
                  role="img"
                  aria-label={`Graça do ${rotulo}${graca ? "" : " (vazia)"}`}
                >
                  {desenho}
                </svg>
                <div className="flex min-w-0 flex-col items-center gap-1 lg:items-start">
                  {editando === forma ? (
                    <EditarGraca
                      personagemId={personagemId}
                      forma={forma}
                      atual={graca}
                      aoFechar={() => setEditando(null)}
                      aoMudar={aoMudarGracas}
                    />
                  ) : (
                    <>
                      {graca ? (
                        <>
                          <p className={cn("font-heading text-base font-bold uppercase", cor)}>{graca.nome ?? rotulo}</p>
                          {graca.descricao && <p className="text-base leading-snug">{graca.descricao}</p>}
                        </>
                      ) : (
                        <p className="text-base text-muted-foreground/60">—</p>
                      )}
                      {souMestre && (
                        <Button variant="ghost" size="sm" onClick={() => setEditando(forma)}>
                          <Pencil /> {graca ? "Editar" : "Conceder"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
