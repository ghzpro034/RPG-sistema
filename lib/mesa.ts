import { assinar } from "@/lib/ficha";
import type { Personagem, Rolagem } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/server";

export type CardPersonagem = Pick<
  Personagem,
  "id" | "nome" | "vida" | "vida_max" | "pe" | "pe_max" | "corrupcao" | "defesa" | "congelado" | "retrato_path"
> & { jogador: string; retratoUrl: string | null; itens: number };

export type DadosMesa = { personagens: CardPersonagem[]; rolagens: Rolagem[] };

// Tudo o que o painel do mestre mostra ao abrir; depois o Realtime mantém em dia.
export async function carregarMesa(campanhaId: string): Promise<DadosMesa> {
  const supabase = await createClient();
  const [{ data: personagens }, { data: rolagens }] = await Promise.all([
    supabase
      .from("personagens")
      .select("id, nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado, retrato_path, profiles(nome), inventario(count)")
      .eq("campanha_id", campanhaId)
      .order("nome"),
    supabase
      .from("rolagens")
      .select("*")
      .eq("campanha_id", campanhaId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const urls = await assinar(supabase, (personagens ?? []).map((p) => p.retrato_path));

  return {
    personagens: (personagens ?? []).map(({ profiles, inventario, ...p }) => ({
      ...p,
      // sem os tipos gerados do banco, o supabase-js tipa as relações como lista
      jogador: (profiles as unknown as { nome: string } | null)?.nome ?? "Jogador",
      itens: (inventario as unknown as { count: number }[])?.[0]?.count ?? 0,
      retratoUrl: p.retrato_path ? (urls.get(p.retrato_path) ?? null) : null,
    })),
    rolagens: (rolagens ?? []) as Rolagem[],
  };
}
