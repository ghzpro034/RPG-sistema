"use client";

import { Sword } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Resposta = { morrendo: boolean; antes: number; depois: number; final: number; instavel?: boolean; protecao?: number };

// Mestre: digita o dano e o app faz a conta do Compêndio (Defender corta pela metade, a Proteção desconta,
// Instável vai a 0). Morrendo não mexe na vida: qualquer ataque é morte definitiva, e o mestre decide.
export function AplicarDano({
  personagemId,
  nome,
  protecao,
  aoAplicar,
}: {
  personagemId: string;
  nome: string;
  protecao: number;
  /** a vida que ficou no banco: a Mesa atualiza o card na hora, sem esperar o tempo real */
  aoAplicar: (vida: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function aplicar(form: FormData) {
    const dano = Math.round(Number(form.get("dano")));
    if (!dano || dano < 1) return toast.error("Digite o dano");
    setEnviando(true);
    const defendeu = form.get("defendeu") === "on";
    const { data, error } = await supabase.rpc("aplicar_dano", {
      p_personagem: personagemId,
      p_dano: dano,
      p_defendeu: defendeu,
      p_vulneravel: form.get("vulneravel") === "on",
    });
    setEnviando(false);
    if (error) return toast.error(error.message);
    const r = data as Resposta;
    if (r.morrendo) {
      toast.warning(`${nome} está Morrendo: qualquer ataque é morte definitiva. Se for o caso, use “Morreu”.`);
    } else if (r.final === 0) {
      aoAplicar(r.depois);
      toast.success(
        `${nome} não sofreu dano (${(r.protecao ?? 0) > 0 ? "a Proteção absorveu tudo" : defendeu ? "a metade arredondou para 0" : "dano 0"})`,
      );
    } else {
      aoAplicar(r.depois);
      toast.success(
        `${nome}: −${r.final} de vida (${r.antes} → ${r.depois})${r.instavel && r.depois === 0 ? ". Estava Instável: foi a 0" : ""}`,
      );
    }
    setAberto(false);
  }

  if (!aberto) {
    return (
      <Button variant="outline" size="lg" onClick={() => setAberto(true)}>
        <Sword /> Dano
      </Button>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2 rounded-lg border border-instavel/40 bg-instavel/5 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void aplicar(new FormData(e.currentTarget));
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          name="dano"
          type="number"
          inputMode="numeric"
          min={1}
          autoFocus
          aria-label={`Dano em ${nome}`}
          placeholder="Dano"
          className="h-11 w-24 text-center text-xl md:text-xl"
        />
        <Button type="submit" size="lg" className="h-11 flex-1 font-heading" disabled={enviando}>
          Aplicar
        </Button>
        <Button type="button" variant="ghost" size="lg" className="h-11" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
      <label className="flex min-h-10 items-center gap-2 text-base">
        <input type="checkbox" name="defendeu" className="size-5 accent-[var(--ouro)]" />
        Defendeu (passou no D20 de Resistência): metade do dano
      </label>
      <label className="flex min-h-10 items-center gap-2 text-base">
        <input type="checkbox" name="vulneravel" className="size-5 accent-[var(--ouro)]" />
        Vulnerável (ex.: Recuperou Foco): sem a Proteção
      </label>
      <p className="text-sm text-muted-foreground">Proteção de {nome}: {protecao}.</p>
    </form>
  );
}
