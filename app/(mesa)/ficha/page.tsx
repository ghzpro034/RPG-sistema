import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obterSessao } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

const GRUPOS = { forca: "Força", mental: "Mental", social: "Social" } as const;

// Provisório: confirma que a ficha vem do banco. A ficha de verdade é a Fase 2.
async function Ficha() {
  const sessao = await obterSessao();
  if (!sessao?.personagemId) redirect("/");

  const supabase = await createClient();
  const [{ data: personagem }, { data: atributos }] = await Promise.all([
    supabase
      .from("personagens")
      .select("nome, nivel, vida, vida_max, pe, pe_max")
      .eq("id", sessao.personagemId)
      .single(),
    supabase
      .from("atributos")
      .select("grupo, nome, valor")
      .eq("personagem_id", sessao.personagemId)
      .order("ordem"),
  ]);
  if (!personagem) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-heading text-sm tracking-widest text-muted-foreground">
          NÍVEL {personagem.nivel}
        </p>
        <h1 className="text-3xl tracking-wide">{personagem.nome}</h1>
        <p className="mt-2 text-lg">
          Vida{" "}
          <span className="font-heading">
            {personagem.vida}/{personagem.vida_max}
          </span>{" "}
          · PE{" "}
          <span className="font-heading text-ouro">
            {personagem.pe}/{personagem.pe_max}
          </span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).map((grupo) => (
          <section key={grupo} className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 text-sm tracking-widest text-ouro uppercase">{GRUPOS[grupo]}</h2>
            <ul className="text-lg">
              {atributos
                ?.filter((a) => a.grupo === grupo)
                .map((a) => (
                  <li key={a.nome} className="flex justify-between">
                    {a.nome} <span className="font-heading">{a.valor}</span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function FichaPage() {
  return (
    <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando a ficha…</p>}>
      <Ficha />
    </Suspense>
  );
}
