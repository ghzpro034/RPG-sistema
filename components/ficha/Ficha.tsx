"use client";

import { Check, Loader2, Pencil } from "lucide-react";
import { Atributos } from "@/components/ficha/Atributos";
import { Baralho } from "@/components/ficha/Baralho";
import { Cabecalho } from "@/components/ficha/Cabecalho";
import { Conhecimento } from "@/components/ficha/Conhecimento";
import { FichaProvider, useFicha, type StatusSalvamento } from "@/components/ficha/contexto";
import { Inventario } from "@/components/ficha/Inventario";
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
  const { editando, setEditando, status } = useFicha();
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

export function Ficha({ dados }: { dados: DadosFicha }) {
  return (
    <FichaProvider inicial={dados.personagem} souMestre={dados.souMestre}>
      <div className="flex flex-col gap-8">
        <BarraEdicao />
        <Cabecalho retratoInicial={dados.retratoUrl} cartas={dados.cartas} />
        <Vitais />
        <Atributos inicial={dados.atributos} />

        <Tabs defaultValue="baralho" className="gap-4">
          <TabsList className="h-11! w-full">
            <TabsTrigger value="baralho" className="text-base">Baralho</TabsTrigger>
            <TabsTrigger value="inventario" className="text-base">Inventário</TabsTrigger>
            <TabsTrigger value="conhecimento" className="text-base">Conhecimento</TabsTrigger>
          </TabsList>
          <TabsContent value="baralho">
            <Baralho cartas={dados.cartas} />
          </TabsContent>
          <TabsContent value="inventario">
            <Inventario inicial={dados.inventario} />
          </TabsContent>
          <TabsContent value="conhecimento">
            <Conhecimento />
          </TabsContent>
        </Tabs>
      </div>
    </FichaProvider>
  );
}
