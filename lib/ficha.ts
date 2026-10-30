import { assinar, carregarCartas, carregarCatalogo, carregarGracas, carregarInventario } from "@/lib/conteudo";
import type { Atributo, DadosFicha, Personagem } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/server";

// Tudo o que a ficha mostra, já com as URLs das imagens. O RLS decide o que volta.
export async function carregarFicha(personagemId: string, souMestre: boolean): Promise<DadosFicha | null> {
  const supabase = await createClient();

  const { data: personagem } = await supabase.from("personagens").select("*").eq("id", personagemId).maybeSingle();
  if (!personagem) return null;

  const [{ data: atributos }, cartas, inventario, gracas, retrato, catalogo] = await Promise.all([
    supabase.from("atributos").select("id, grupo, nome, valor, ordem").eq("personagem_id", personagemId).order("ordem"),
    carregarCartas(supabase, personagemId),
    carregarInventario(supabase, personagemId),
    carregarGracas(supabase, personagemId),
    assinar(supabase, [personagem.retrato_path]),
    souMestre ? carregarCatalogo(supabase, personagem.campanha_id) : null,
  ]);

  return {
    personagem: personagem as Personagem,
    retratoUrl: personagem.retrato_path ? (retrato.get(personagem.retrato_path) ?? null) : null,
    atributos: (atributos ?? []) as Atributo[],
    cartas,
    inventario,
    gracas,
    catalogoCartas: catalogo?.cartas ?? [],
    souMestre,
  };
}
