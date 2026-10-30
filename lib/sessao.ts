import { createClient } from "@/lib/supabase/server";

export type Papel = "mestre" | "player";

export type Sessao = {
  userId: string;
  nome: string;
  campanha: { id: string; nome: string; codigo_convite: string } | null;
  papel: Papel | null;
  personagemId: string | null;
};

// Quem está logado, em qual mesa e com qual papel. Por enquanto, uma mesa por usuário.
export async function obterSessao(): Promise<Sessao | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: perfil }, { data: membro }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    supabase
      .from("membros")
      .select("papel, campanhas(id, nome, codigo_convite)")
      .eq("user_id", userId)
      .order("papel")
      .limit(1)
      .maybeSingle(),
  ]);

  // sem os tipos gerados do banco, o supabase-js tipa a relação como lista
  const campanha = (membro?.campanhas as unknown as Sessao["campanha"]) ?? null;
  let personagemId: string | null = null;
  if (campanha) {
    const { data: personagem } = await supabase
      .from("personagens")
      .select("id")
      .eq("campanha_id", campanha.id)
      .eq("dono_id", userId)
      .limit(1)
      .maybeSingle();
    personagemId = personagem?.id ?? null;
  }

  return {
    userId,
    nome: perfil?.nome ?? "Jogador",
    campanha,
    papel: (membro?.papel as Papel) ?? null,
    personagemId,
  };
}

// Para onde cada um vai ao entrar: mestre no painel, player na ficha.
export function destinoDe(sessao: Sessao | null) {
  if (!sessao) return "/entrar";
  if (!sessao.campanha) return "/comecar";
  if (sessao.papel === "mestre") return "/mesa";
  return sessao.personagemId ? "/ficha" : "/comecar";
}
