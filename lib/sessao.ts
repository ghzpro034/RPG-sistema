import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Papel = "mestre" | "player";

export type Mesa = { id: string; nome: string; codigo_convite: string; papel: Papel };

export type Sessao = {
  userId: string;
  nome: string;
  /** todas as mesas do usuário (como mestre ou player) */
  mesas: Mesa[];
  /** a mesa escolhida agora; o papel vale para ela */
  campanha: Mesa | null;
  papel: Papel | null;
  /** um personagem por player; a mesma ficha pode estar em várias mesas */
  personagemId: string | null;
};

export const COOKIE_MESA = "grimorio_mesa";

// Quem está logado, em quais mesas, qual está aberta e com qual papel.
export async function obterSessao(): Promise<Sessao | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: perfil }, { data: membros }, { data: personagem }, cookieStore] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    supabase.from("membros").select("papel, campanhas(id, nome, codigo_convite)").eq("user_id", userId),
    supabase.from("personagens").select("id").eq("dono_id", userId).limit(1).maybeSingle(),
    cookies(),
  ]);

  // sem os tipos gerados do banco, o supabase-js tipa a relação como lista
  const mesas = (membros ?? [])
    .map((m) => ({ ...(m.campanhas as unknown as Omit<Mesa, "papel">), papel: m.papel as Papel }))
    .filter((m) => m.id)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const escolhida = cookieStore.get(COOKIE_MESA)?.value;
  const campanha = mesas.find((m) => m.id === escolhida) ?? mesas[0] ?? null;

  return {
    userId,
    nome: perfil?.nome ?? "Jogador",
    mesas,
    campanha,
    papel: campanha?.papel ?? null,
    personagemId: personagem?.id ?? null,
  };
}

// Para onde cada um vai ao entrar: mestre no painel, player na ficha.
export function destinoDe(sessao: Sessao | null) {
  if (!sessao) return "/entrar";
  if (!sessao.campanha) return "/comecar";
  if (sessao.papel === "mestre") return "/mesa";
  return sessao.personagemId ? "/ficha" : "/comecar";
}
