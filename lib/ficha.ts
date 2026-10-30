import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_IMAGENS,
  VALIDADE_URL,
  type Atributo,
  type Carta,
  type DadosFicha,
  type ItemInventario,
  type Personagem,
} from "@/lib/ficha-tipos";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

// Gera as URLs assinadas de várias imagens de uma vez.
export async function assinar(supabase: Supabase, caminhos: (string | null)[]) {
  const validos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  if (!validos.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(BUCKET_IMAGENS).createSignedUrls(validos, VALIDADE_URL);
  return new Map(
    (data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])),
  );
}

// Tudo o que a ficha mostra, já com as URLs das imagens. O RLS decide o que volta.
export async function carregarFicha(personagemId: string, souMestre: boolean): Promise<DadosFicha | null> {
  const supabase = await createClient();

  const [{ data: personagem }, { data: atributos }, { data: cartas }, { data: inventario }] =
    await Promise.all([
      supabase.from("personagens").select("*").eq("id", personagemId).maybeSingle(),
      supabase.from("atributos").select("id, grupo, nome, valor, ordem").eq("personagem_id", personagemId).order("ordem"),
      supabase
        .from("personagem_cartas")
        .select("cartas(id, tipo, nome, citacao, efeitos, custo, imagem_path)")
        .eq("personagem_id", personagemId),
      supabase
        .from("inventario")
        .select("id, quantidade, memorias_desbloqueadas, itens(id, nome, raridade, efeito, descricao, max_memorias, imagem_path)")
        .eq("personagem_id", personagemId)
        .order("id"),
    ]);
  if (!personagem) return null;

  // sem os tipos gerados do banco, o supabase-js tipa as relações como lista
  type CartaBanco = Omit<Carta, "imagemUrl"> & { imagem_path: string | null };
  type ItemBanco = Omit<ItemInventario["item"], "imagemUrl"> & { imagem_path: string | null };
  const listaCartas = (cartas ?? []).map((c) => c.cartas as unknown as CartaBanco).filter(Boolean);
  const listaItens = (inventario ?? []).map((i) => ({ ...i, item: i.itens as unknown as ItemBanco }));

  const urls = await assinar(supabase, [
    personagem.retrato_path,
    ...listaCartas.map((c) => c.imagem_path),
    ...listaItens.map((i) => i.item.imagem_path),
  ]);
  const url = (caminho: string | null) => (caminho ? (urls.get(caminho) ?? null) : null);

  return {
    personagem: personagem as Personagem,
    retratoUrl: url(personagem.retrato_path),
    atributos: (atributos ?? []) as Atributo[],
    cartas: listaCartas.map(({ imagem_path, ...c }) => ({ ...c, imagemUrl: url(imagem_path) })),
    inventario: listaItens.map(({ id, quantidade, memorias_desbloqueadas, item: { imagem_path, ...item } }) => ({
      id,
      quantidade,
      memorias_desbloqueadas,
      item: { ...item, imagemUrl: url(imagem_path) },
    })),
    souMestre,
  };
}
