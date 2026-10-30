import { assinar } from "@/lib/conteudo";
import type { Personagem, Raridade, Rolagem } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/server";

export type CardPersonagem = Pick<
  Personagem,
  "id" | "nome" | "vida" | "vida_max" | "pe" | "pe_max" | "corrupcao" | "defesa" | "congelado" | "retrato_path"
> & { jogador: string; retratoUrl: string | null; itens: number };

export type Alteracao = {
  id: number;
  personagem_id: string | null;
  autor_id: string | null;
  tabela: string;
  campo: string;
  de: string | null;
  para: string | null;
  created_at: string;
};

export type DadosMesa = {
  personagens: CardPersonagem[];
  rolagens: Rolagem[];
  alteracoes: Alteracao[];
  itens: { id: string; nome: string; raridade: Raridade }[];
  /** nome de cada membro da mesa, para dizer quem mudou o quê */
  autores: Record<string, string>;
};

// Tudo o que o painel do mestre mostra ao abrir; depois o Realtime mantém em dia.
export async function carregarMesa(campanhaId: string): Promise<DadosMesa> {
  const supabase = await createClient();
  const [{ data: personagens }, { data: rolagens }, { data: alteracoes }, { data: itens }, { data: membros }] =
    await Promise.all([
      supabase
        .from("personagens")
        .select("id, nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado, retrato_path, profiles(nome), inventario(count)")
        .eq("campanha_id", campanhaId)
        .order("nome"),
      supabase.from("rolagens").select("*").eq("campanha_id", campanhaId).order("created_at", { ascending: false }).limit(20),
      supabase.from("alteracoes").select("*").eq("campanha_id", campanhaId).order("id", { ascending: false }).limit(30),
      supabase.from("itens").select("id, nome, raridade").eq("campanha_id", campanhaId).order("nome"),
      supabase.from("membros").select("user_id, profiles(nome)").eq("campanha_id", campanhaId),
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
    alteracoes: (alteracoes ?? []) as Alteracao[],
    itens: (itens ?? []) as DadosMesa["itens"],
    autores: Object.fromEntries(
      (membros ?? []).map((m) => [m.user_id, (m.profiles as unknown as { nome: string } | null)?.nome ?? "?"]),
    ),
  };
}
