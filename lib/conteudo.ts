import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUCKET_IMAGENS,
  VALIDADE_URL,
  type Carta,
  type Graca,
  type ItemCatalogo,
  type ItemInventario,
} from "@/lib/ficha-tipos";

// Carregadores que servem tanto no servidor quanto no navegador (Realtime recarrega com eles).

const CAMPOS_CARTA = "id, tipo, nome, citacao, efeitos, custo, imagem_path";
const CAMPOS_ITEM = "id, nome, raridade, efeito, descricao, max_memorias, imagem_path";

// Gera as URLs assinadas de várias imagens de uma vez.
export async function assinar(supabase: SupabaseClient, caminhos: (string | null)[]) {
  const validos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  if (!validos.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(BUCKET_IMAGENS).createSignedUrls(validos, VALIDADE_URL);
  return new Map(
    (data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])),
  );
}

async function comUrl<T extends { imagem_path: string | null }>(supabase: SupabaseClient, lista: T[]) {
  const urls = await assinar(supabase, lista.map((x) => x.imagem_path));
  return lista.map((x) => ({ ...x, imagemUrl: x.imagem_path ? (urls.get(x.imagem_path) ?? null) : null }));
}

export async function carregarCartas(supabase: SupabaseClient, personagemId: string): Promise<Carta[]> {
  const { data } = await supabase
    .from("personagem_cartas")
    .select(`cartas(${CAMPOS_CARTA})`)
    .eq("personagem_id", personagemId);
  // sem os tipos gerados do banco, o supabase-js tipa as relações como lista
  const cartas = (data ?? []).map((c) => c.cartas as unknown as Omit<Carta, "imagemUrl">).filter(Boolean);
  return comUrl(supabase, cartas);
}

export async function carregarInventario(supabase: SupabaseClient, personagemId: string): Promise<ItemInventario[]> {
  const { data } = await supabase
    .from("inventario")
    .select(`id, quantidade, memorias_desbloqueadas, itens(${CAMPOS_ITEM})`)
    .eq("personagem_id", personagemId)
    .order("id");
  const linhas = (data ?? []).map(({ itens, ...linha }) => ({
    ...linha,
    item: itens as unknown as Omit<ItemCatalogo, "imagemUrl">,
  }));
  const itens = await comUrl(supabase, linhas.map((l) => l.item));
  return linhas.map((l, n) => ({ ...l, item: itens[n] }));
}

export async function carregarGracas(supabase: SupabaseClient, personagemId: string): Promise<Graca[]> {
  const { data } = await supabase.from("gracas").select("*").eq("personagem_id", personagemId);
  return (data ?? []) as Graca[];
}

// o catálogo é do mestre e vale em todas as mesas dele
export async function carregarCatalogo(supabase: SupabaseClient, mestreId: string) {
  const [{ data: itens }, { data: cartas }] = await Promise.all([
    supabase.from("itens").select(CAMPOS_ITEM).eq("mestre_id", mestreId).order("nome"),
    supabase.from("cartas").select(CAMPOS_CARTA).eq("mestre_id", mestreId).order("tipo").order("nome"),
  ]);
  const [itensComUrl, cartasComUrl] = await Promise.all([
    comUrl(supabase, (itens ?? []) as Omit<ItemCatalogo, "imagemUrl">[]),
    comUrl(supabase, (cartas ?? []) as Omit<Carta, "imagemUrl">[]),
  ]);
  return { itens: itensComUrl as ItemCatalogo[], cartas: cartasComUrl as Carta[] };
}
