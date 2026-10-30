"use client";

import { Check, Loader2, Pencil, Skull } from "lucide-react";
import { Atributos } from "@/components/ficha/Atributos";
import { Baralho } from "@/components/ficha/Baralho";
import { Cabecalho } from "@/components/ficha/Cabecalho";
import { Conhecimento } from "@/components/ficha/Conhecimento";
import { useConteudoAoVivo } from "@/components/ficha/conteudo";
import { FichaProvider, useFicha, type StatusSalvamento } from "@/components/ficha/contexto";
import { EnganarMorte } from "@/components/ficha/EnganarMorte";
import { Inventario } from "@/components/ficha/Inventario";
import { MemoriasGracas } from "@/components/ficha/MemoriasGracas";
import { PainelResultado, RoladorProvider } from "@/components/ficha/rolador";
import { Travas } from "@/components/ficha/Travas";
import { Vitais } from "@/components/ficha/Vitais";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DadosFicha } from "@/lib/ficha-tipos";

const TEXTO_STATUS: Record<StatusSalvamento, string> = {
  ocioso: "",
  salvando: "Salvando…",
  salvo: "Salvo",
  erro: "Não salvou",
};

function BarraEdicao() {
  const { personagem, editando, setEditando, status, morto } = useFicha();
  if (morto) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-card px-4 py-4 text-center">
        <Skull className="size-7 text-muted-foreground" aria-hidden />
        <p className="font-heading text-lg tracking-[0.2em] uppercase">No memorial</p>
        <p className="text-base text-muted-foreground" suppressHydrationWarning>
          Morreu em {new Date(personagem.morto_em!).toLocaleDateString("pt-BR")}. A ficha é só leitura.
        </p>
        {personagem.epitafio && <p className="mt-1 max-w-prose text-lg italic">“{personagem.epitafio}”</p>}
      </div>
    );
  }
  return (
    <div className="sticky top-0 z-10 -mx-4 flex items-center justify-end gap-3 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur">
      <span className="flex items-center gap-1.5 text-base text-muted-foreground" aria-live="polite">
        {status === "salvando" && <Loader2 className="size-4 animate-spin" />}
        {TEXTO_STATUS[status]}
      </span>
      <Button
        variant={editando ? "default" : "outline"}
        size="lg"
        className="font-heading tracking-wider"
        onClick={() => setEditando(!editando)}
      >
        {editando ? <Check /> : <Pencil />}
        {editando ? "Concluir" : "Editar ficha"}
      </Button>
    </div>
  );
}

// arquétipo e trauma no Baralho; habilidade e revolta na aba própria, como no Canva
const TIPOS_BARALHO = ["arquetipo", "trauma"] as const;
const TIPOS_HABILIDADE = ["habilidade", "revolta"] as const;

function Conteudo({ dados }: { dados: DadosFicha }) {
  const { personagem, souMestre: mestre, morto } = useFicha();
  // no memorial o mestre só lê: some o dar carta, memórias e graças
  const souMestre = mestre && !morto;
  const ao = useConteudoAoVivo(personagem.id, dados);
  // remonta o inventário quando o banco muda (item entregue pelo mestre, por exemplo)
  const chaveInventario = ao.inventario.map((i) => `${i.id}:${i.quantidade}:${i.memorias_desbloqueadas}`).join("|");

  return (
    <>
      <Cabecalho retratoInicial={dados.retratoUrl} cartas={ao.cartas} />
      <Vitais />
      <Atributos inicial={dados.atributos} />

      <Tabs defaultValue="baralho" className="gap-4">
        <TabsList className="h-11! w-full justify-start overflow-x-auto [scrollbar-width:none]">
          <TabsTrigger value="baralho" className="flex-none px-3 text-base">Baralho</TabsTrigger>
          <TabsTrigger value="inventario" className="flex-none px-3 text-base">Inventário</TabsTrigger>
          <TabsTrigger value="habilidade" className="flex-none px-3 text-base">Habilidade e Revolta</TabsTrigger>
          <TabsTrigger value="conhecimento" className="flex-none px-3 text-base">Conhecimento</TabsTrigger>
          <TabsTrigger value="memorias" className="flex-none px-3 text-base">Memórias e Graças</TabsTrigger>
        </TabsList>
        <TabsContent value="baralho">
          <Baralho
            personagemId={personagem.id}
            cartas={ao.cartas}
            tipos={[...TIPOS_BARALHO]}
            vazio="O mestre ainda não te deu nenhuma carta."
            souMestre={souMestre}
            catalogo={dados.catalogoCartas}
            aoMudar={ao.recarregarCartas}
          />
        </TabsContent>
        <TabsContent value="inventario">
          <Inventario key={chaveInventario} inicial={ao.inventario} />
        </TabsContent>
        <TabsContent value="habilidade" className="flex flex-col gap-5">
          <Baralho
            personagemId={personagem.id}
            cartas={ao.cartas}
            tipos={[...TIPOS_HABILIDADE]}
            vazio="Nenhuma habilidade ou revolta ainda."
            souMestre={souMestre}
            catalogo={dados.catalogoCartas}
            aoMudar={ao.recarregarCartas}
          />
          <EnganarMorte />
        </TabsContent>
        <TabsContent value="conhecimento">
          <Conhecimento />
        </TabsContent>
        <TabsContent value="memorias">
          <MemoriasGracas
            personagemId={personagem.id}
            inventario={ao.inventario}
            gracas={ao.gracas}
            souMestre={souMestre}
            aoMudarInventario={ao.recarregarInventario}
            aoMudarGracas={ao.recarregarGracas}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export function Ficha({ dados }: { dados: DadosFicha }) {
  return (
    <FichaProvider inicial={dados.personagem} souMestre={dados.souMestre}>
      <RoladorProvider campanhaAtual={dados.campanhaAtual}>
        {/* pb-28: espaço para o painel do resultado, que fica preso embaixo */}
        <div className="flex flex-col gap-8 pb-28">
          <BarraEdicao />
          {dados.souMestre && !dados.personagem.morto_em && <Travas />}
          <Conteudo dados={dados} />
        </div>
        <PainelResultado />
      </RoladorProvider>
    </FichaProvider>
  );
}
