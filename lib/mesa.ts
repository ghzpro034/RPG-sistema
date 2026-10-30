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

/** personagem que está em outra mesa deste mestre e pode ser trazido para esta */
export type Disponivel = { id: string; nome: string; mesas: string[] };

export type DadosMesa = {
  personagens: CardPersonagem[];
  rolagens: Rolagem[];
  alteracoes: Alteracao[];
  itens: { id: string; nome: string; raridade: Raridade }[];
  /** nome de cada membro da mesa, para dizer quem mudou o quê */
  autores: Record<string, string>;
  disponiveis: Disponivel[];
};

type LinhaPersonagem = Omit<CardPersonagem, "jogador" | "retratoUrl" | "itens"> & {
  profiles: { nome: string } | null;
  inventario: { count: number }[];
};

// Tudo o que o painel do mestre mostra ao abrir; depois o Realtime mantém em dia.
export async function carregarMesa(campanhaId: string, mestreId: string, outrasMesas: string[]): Promise<DadosMesa> {
  const supabase = await createClient();
  const [{ data: linhas }, { data: rolagens }, { data: itens }, { data: membros }, { data: deOutras }] =
    await Promise.all([
      supabase
        .from("mesa_personagens")
        .select(
          "personagens(id, nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado, retrato_path, profiles(nome), inventario(count))",
        )
        .eq("campanha_id", campanhaId),
      supabase.from("rolagens").select("*").eq("campanha_id", campanhaId).order("created_at", { ascending: false }).limit(20),
      supabase.from("itens").select("id, nome, raridade").eq("mestre_id", mestreId).order("nome"),
      supabase.from("membros").select("user_id, profiles(nome)").eq("campanha_id", campanhaId),
      outrasMesas.length
        ? supabase.from("mesa_personagens").select("personagem_id, personagens(nome), campanhas(nome)").in("campanha_id", outrasMesas)
        : Promise.resolve({ data: [] as never[] }),
    ]);

  // sem os tipos gerados do banco, o supabase-js tipa as relações como lista
  const personagens = (linhas ?? [])
    .map((l) => l.personagens as unknown as LinhaPersonagem | null)
    .filter((p): p is LinhaPersonagem => Boolean(p))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const aqui = new Set(personagens.map((p) => p.id));

  const [urls, { data: alteracoes }] = await Promise.all([
    assinar(supabase, personagens.map((p) => p.retrato_path)),
    aqui.size
      ? supabase.from("alteracoes").select("*").in("personagem_id", [...aqui]).order("id", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as Alteracao[] }),
  ]);

  // quem está nas outras mesas e ainda não está aqui, com o nome das mesas de onde vem
  const disponiveis = new Map<string, Disponivel>();
  for (const linha of (deOutras ?? []) as { personagem_id: string; personagens: unknown; campanhas: unknown }[]) {
    if (aqui.has(linha.personagem_id)) continue;
    const nome = (linha.personagens as { nome: string } | null)?.nome;
    const mesa = (linha.campanhas as { nome: string } | null)?.nome;
    if (!nome) continue;
    const atual = disponiveis.get(linha.personagem_id) ?? { id: linha.personagem_id, nome, mesas: [] };
    if (mesa) atual.mesas.push(mesa);
    disponiveis.set(linha.personagem_id, atual);
  }

  return {
    personagens: personagens.map(({ profiles, inventario, ...p }) => ({
      ...p,
      jogador: profiles?.nome ?? "Jogador",
      itens: inventario?.[0]?.count ?? 0,
      retratoUrl: p.retrato_path ? (urls.get(p.retrato_path) ?? null) : null,
    })),
    rolagens: (rolagens ?? []) as Rolagem[],
    alteracoes: (alteracoes ?? []) as Alteracao[],
    itens: (itens ?? []) as DadosMesa["itens"],
    autores: Object.fromEntries(
      (membros ?? []).map((m) => [m.user_id, (m.profiles as unknown as { nome: string } | null)?.nome ?? "?"]),
    ),
    disponiveis: [...disponiveis.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
  };
}
