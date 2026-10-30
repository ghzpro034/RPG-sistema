"use client";

import { Plus, X } from "lucide-react";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Carta, TipoCarta } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

const ESTILO: Record<TipoCarta, { rotulo: string; moldura: string; titulo: string; texto: string; marcador: string }> = {
  arquetipo: { rotulo: "Arquétipo", moldura: "border-white/70", titulo: "text-ouro", texto: "text-ouro/90", marcador: "marker:text-ouro" },
  trauma: { rotulo: "Trauma", moldura: "border-sangue", titulo: "text-instavel", texto: "text-instavel/90", marcador: "marker:text-instavel" },
  habilidade: { rotulo: "Habilidade", moldura: "border-social", titulo: "text-social", texto: "text-foreground", marcador: "marker:text-social" },
  revolta: { rotulo: "Revolta", moldura: "border-caminho", titulo: "text-caminho", texto: "text-foreground", marcador: "marker:text-caminho" },
};

// Mestre: escolhe uma carta do catálogo e dá ao personagem.
function DarCarta({
  personagemId,
  disponiveis,
  aoMudar,
}: {
  personagemId: string;
  disponiveis: Carta[];
  aoMudar: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [escolhida, setEscolhida] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!disponiveis.length) {
    return <p className="text-base text-muted-foreground">Nenhuma carta do catálogo para dar. Crie no Catálogo.</p>;
  }

  async function dar() {
    if (!escolhida) return;
    setEnviando(true);
    const { error } = await supabase.from("personagem_cartas").insert({ personagem_id: personagemId, carta_id: escolhida });
    if (error) toast.error(error.message);
    else {
      toast.success("Carta entregue");
      setEscolhida("");
      await aoMudar();
    }
    setEnviando(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ouro/30 bg-ouro/5 p-3">
      <select
        value={escolhida}
        onChange={(e) => setEscolhida(e.target.value)}
        aria-label="Carta do catálogo"
        className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-input/30 px-2.5 text-lg"
      >
        <option value="">Escolha uma carta…</option>
        {disponiveis.map((c) => (
          <option key={c.id} value={c.id}>
            {ESTILO[c.tipo].rotulo}: {c.nome}
          </option>
        ))}
      </select>
      <Button size="lg" className="h-10" disabled={!escolhida || enviando} onClick={dar}>
        <Plus /> Dar carta
      </Button>
    </div>
  );
}

// Cartas como na ficha do Canva: a carta à esquerda, o texto à direita.
export function Baralho({
  personagemId,
  cartas,
  tipos,
  vazio,
  souMestre,
  catalogo,
  aoMudar,
}: {
  personagemId: string;
  cartas: Carta[];
  tipos: TipoCarta[];
  vazio: string;
  souMestre: boolean;
  catalogo: Carta[];
  aoMudar: () => Promise<void>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const visiveis = cartas.filter((c) => tipos.includes(c.tipo));
  const disponiveis = catalogo.filter((c) => tipos.includes(c.tipo) && !cartas.some((d) => d.id === c.id));

  async function tirar(carta: Carta) {
    const { error } = await supabase
      .from("personagem_cartas")
      .delete()
      .eq("personagem_id", personagemId)
      .eq("carta_id", carta.id);
    if (error) return toast.error(error.message);
    toast.success(`${carta.nome} retirada`);
    await aoMudar();
  }

  return (
    <div className="flex flex-col gap-5">
      {souMestre && <DarCarta personagemId={personagemId} disponiveis={disponiveis} aoMudar={aoMudar} />}
      {visiveis.length ? (
        <ul className="grid gap-8 lg:grid-cols-2">
          {visiveis.map((c) => {
            const estilo = ESTILO[c.tipo];
            return (
              <li key={c.id} className="flex gap-4">
                <div
                  className={cn(
                    "flex aspect-[5/7] w-28 shrink-0 items-end justify-center overflow-hidden rounded-md border-4 bg-secondary sm:w-32",
                    estilo.moldura,
                  )}
                >
                  {c.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                    <img src={c.imagemUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="mb-2 px-1 text-center font-heading text-[0.65rem] tracking-wider uppercase">{c.nome}</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">{estilo.rotulo}</span>
                    {souMestre && (
                      <Button variant="ghost" size="icon-sm" aria-label={`Retirar ${c.nome}`} onClick={() => tirar(c)}>
                        <X />
                      </Button>
                    )}
                  </div>
                  <h3 className={cn("text-xl font-bold tracking-wide uppercase", estilo.titulo)}>{c.nome}</h3>
                  {c.citacao && <p className="text-lg italic">“{c.citacao}”</p>}
                  {c.efeitos.length > 0 && (
                    <ul className={cn("list-disc pl-5 text-lg leading-snug", estilo.texto, estilo.marcador)}>
                      {c.efeitos.map((efeito) => (
                        <li key={efeito}>{efeito}</li>
                      ))}
                    </ul>
                  )}
                  {c.custo && (
                    <p className="text-base text-muted-foreground">
                      Custo: <span className="font-heading text-ouro uppercase">{c.custo}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-6 text-center text-lg text-muted-foreground">{vazio}</p>
      )}
    </div>
  );
}
