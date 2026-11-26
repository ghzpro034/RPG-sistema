"use client";

import { Layers, Plus, Sparkles, X, Zap } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { MAX_ARQUETIPOS, nomeDoCaminho, type Carta, type TipoCarta } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";
import { Vazio } from "@/components/Estados";

const ESTILO: Record<TipoCarta, { rotulo: string; moldura: string; titulo: string; texto: string; marcador: string }> = {
  arquetipo: { rotulo: "Arquétipo", moldura: "border-white/70", titulo: "text-ouro", texto: "text-ouro/90", marcador: "marker:text-ouro" },
  trauma: { rotulo: "Trauma", moldura: "border-sangue", titulo: "text-instavel", texto: "text-instavel/90", marcador: "marker:text-instavel" },
  habilidade: { rotulo: "Habilidade única", moldura: "border-social", titulo: "text-social", texto: "text-foreground", marcador: "marker:text-social" },
  caminho: { rotulo: "Caminho", moldura: "border-caminho", titulo: "text-caminho", texto: "text-foreground", marcador: "marker:text-caminho" },
};

// "Arquétipo", "Caminho da Revolta · II"…
function rotuloDaCarta(c: Carta) {
  if (c.tipo !== "caminho") return ESTILO[c.tipo].rotulo;
  const caminho = nomeDoCaminho(c.caminho);
  const nome = caminho ? `Caminho ${c.caminho === "amor" ? "do" : "da"} ${caminho}` : "Caminho";
  return c.nivel ? `${nome} · ${c.nivel}` : nome;
}

function textoDoCusto(c: Carta) {
  const partes = [];
  if (c.custo_pe) partes.push(`${c.custo_pe} PE`);
  if (c.custo_sinergia) partes.push(`${c.custo_sinergia} Sinergia`);
  return partes.join(" + ");
}

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
            {rotuloDaCarta(c)}: {c.nome}
          </option>
        ))}
      </select>
      <Button size="lg" className="h-10" disabled={!escolhida || enviando} onClick={dar}>
        <Plus /> Dar carta
      </Button>
    </div>
  );
}

// Pagar o custo da carta (PE e/ou Sinergia): dois toques, para não gastar sem querer.
function UsarCarta({ carta, campanhaAtual }: { carta: Carta; campanhaAtual: string }) {
  const { personagem, sincronizar } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const [confirmando, setConfirmando] = useState(false);
  const [usando, setUsando] = useState(false);
  const custo = textoDoCusto(carta);
  const falta =
    personagem.pe < carta.custo_pe ? "PE" : personagem.sinergia < carta.custo_sinergia ? "Sinergia" : null;

  // o pedido de confirmação some sozinho se ninguém confirmar
  useEffect(() => {
    if (!confirmando) return;
    const espera = setTimeout(() => setConfirmando(false), 5000);
    return () => clearTimeout(espera);
  }, [confirmando]);

  async function usar() {
    setUsando(true);
    const { error } = await supabase.rpc("usar_carta", {
      p_personagem: personagem.id,
      p_carta: carta.id,
      p_campanha: campanhaAtual,
    });
    setUsando(false);
    setConfirmando(false);
    if (error) return toast.error(error.message);
    toast.success(`${carta.nome}: −${custo}`);
    await sincronizar();
  }

  const Icone = carta.custo_sinergia ? Sparkles : Zap;

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" className="h-10" disabled={usando} onClick={usar}>
          <Icone /> Confirmar (−{custo})
        </Button>
        <Button size="lg" variant="ghost" className="h-10" disabled={usando} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="lg"
        variant="outline"
        className="h-10 self-start"
        disabled={Boolean(falta)}
        onClick={() => setConfirmando(true)}
      >
        <Icone /> Usar · {custo}
      </Button>
      {falta && <span className="text-base text-muted-foreground">{falta} insuficiente</span>}
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
  campanhaAtual,
  aoMudar,
}: {
  personagemId: string;
  cartas: Carta[];
  tipos: TipoCarta[];
  vazio: string;
  souMestre: boolean;
  catalogo: Carta[];
  campanhaAtual: string;
  aoMudar: () => Promise<void>;
}) {
  const { morto } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const visiveis = cartas.filter((c) => tipos.includes(c.tipo));
  const arquetipos = cartas.filter((c) => c.tipo === "arquetipo").length;
  const temHabilidade = cartas.some((c) => c.tipo === "habilidade");
  // o banco recusa o 4º arquétipo e a 2ª habilidade única; aqui eles nem aparecem para escolher
  const disponiveis = catalogo.filter(
    (c) =>
      tipos.includes(c.tipo) &&
      !cartas.some((d) => d.id === c.id) &&
      !(c.tipo === "arquetipo" && arquetipos >= MAX_ARQUETIPOS) &&
      !(c.tipo === "habilidade" && temHabilidade),
  );

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
      {tipos.includes("arquetipo") && arquetipos > 0 && (
        <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Arquétipos {arquetipos}/{MAX_ARQUETIPOS}
        </p>
      )}
      {visiveis.length ? (
        <ul className="grid gap-8 lg:grid-cols-2">
          {visiveis.map((c) => {
            const estilo = ESTILO[c.tipo];
            const temCusto = c.custo_pe > 0 || c.custo_sinergia > 0;
            return (
              <li key={c.id} className="flex gap-4">
                <div
                  className={cn(
                    "flex aspect-[5/8] w-28 shrink-0 items-end justify-center self-start overflow-hidden rounded-md border-4 bg-secondary sm:w-32",
                    estilo.moldura,
                  )}
                >
                  {c.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase ou arte embutida
                    <img src={c.imagemUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="mb-2 px-1 text-center font-heading text-[0.65rem] tracking-wider uppercase">{c.nome}</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">
                      {rotuloDaCarta(c)}
                    </span>
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
                  {temCusto && !morto && <UsarCarta carta={c} campanhaAtual={campanhaAtual} />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vazio icone={Layers} titulo="Sem cartas">{vazio}</Vazio>
      )}
    </div>
  );
}
