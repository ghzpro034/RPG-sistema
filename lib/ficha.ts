import { assinar, carregarCartas, carregarCatalogo, carregarGracas, carregarInventario } from "@/lib/conteudo";
import type { Atributo, DadosFicha, Personagem } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/server";

// Tudo o que a ficha mostra, já com as URLs das imagens. O RLS decide o que volta.
// mestreId: quem está abrindo como mestre (para listar o catálogo dele); campanhaAtual: mesa aberta agora
export async function carregarFicha(
  personagemId: string,
  { mestreId, campanhaAtual }: { mestreId: string | null; campanhaAtual: string },
): Promise<DadosFicha | null> {
  const souMestre = mestreId !== null;
  const supabase = await createClient();

  const { data: personagem } = await supabase.from("personagens").select("*").eq("id", personagemId).maybeSingle();
  if (!personagem) return null;

  const [{ data: atributos }, cartas, inventario, gracas, retrato, catalogo] = await Promise.all([
    supabase.from("atributos").select("id, grupo, nome, valor, ordem").eq("personagem_id", personagemId).order("ordem"),
    carregarCartas(supabase, personagemId),
    carregarInventario(supabase, personagemId),
    carregarGracas(supabase, personagemId),
    assinar(supabase, [personagem.retrato_path]),
    mestreId ? carregarCatalogo(supabase, mestreId) : null,
  ]);

  return {
    personagem: personagem as Personagem,
    retratoUrl: personagem.retrato_path ? (retrato.get(personagem.retrato_path) ?? null) : null,
    atributos: (atributos ?? []) as Atributo[],
    cartas,
    inventario,
    gracas,
    catalogoCartas: catalogo?.cartas ?? [],
    campanhaAtual,
    souMestre,
  };
}
