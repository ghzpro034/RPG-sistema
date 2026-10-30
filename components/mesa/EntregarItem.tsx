"use client";

import { Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DadosMesa } from "@/lib/mesa";
import { createClient } from "@/lib/supabase/client";

const SELECT = "h-10 w-full rounded-lg border border-input bg-input/30 px-2.5 text-lg";

// Mestre entrega um item do catálogo; a RPC respeita os 4 espaços e empilha iguais.
export function EntregarItem({
  personagens,
  itens,
}: {
  personagens: { id: string; nome: string }[];
  itens: DadosMesa["itens"];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [enviando, setEnviando] = useState(false);

  async function entregar(form: HTMLFormElement) {
    const dados = new FormData(form);
    const personagem = String(dados.get("personagem"));
    const item = String(dados.get("item"));
    const qtd = Math.max(1, Number(dados.get("qtd")) || 1);
    if (!personagem || !item) return toast.error("Escolha o personagem e o item");

    setEnviando(true);
    const { error } = await supabase.rpc("entregar_item", { p_personagem: personagem, p_item: item, p_qtd: qtd });
    setEnviando(false);
    if (error) return toast.error(error.message);
    const nomeItem = itens.find((i) => i.id === item)?.nome;
    const nomePersonagem = personagens.find((p) => p.id === personagem)?.nome;
    toast.success(`${nomeItem} entregue a ${nomePersonagem}`);
    form.reset();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg tracking-wide">
        <Gift className="size-5 text-ouro" aria-hidden /> Entregar item
      </h2>
      {itens.length && personagens.length ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void entregar(e.currentTarget);
          }}
        >
          <select name="personagem" defaultValue="" aria-label="Personagem" className={SELECT}>
            <option value="" disabled>Para quem…</option>
            {personagens.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select name="item" defaultValue="" aria-label="Item" className={SELECT}>
              <option value="" disabled>Qual item…</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
            <Input name="qtd" type="number" min={1} defaultValue={1} aria-label="Quantidade" className="h-10 w-20 text-lg md:text-lg" />
          </div>
          <Button type="submit" size="lg" disabled={enviando} className="font-heading tracking-wider">
            {enviando ? "Entregando…" : "Entregar"}
          </Button>
        </form>
      ) : (
        <p className="text-base text-muted-foreground">
          {itens.length ? "Nenhum personagem na mesa ainda." : "Crie itens no Catálogo para poder entregar."}
        </p>
      )}
    </section>
  );
}
