import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obterSessao } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

// Provisório: código de convite e lista de fichas. O painel ao vivo é a Fase 3.
async function Painel() {
  const sessao = await obterSessao();
  if (sessao?.papel !== "mestre" || !sessao.campanha) redirect("/");

  const supabase = await createClient();
  const { data: personagens } = await supabase
    .from("personagens")
    .select("id, nome, vida, vida_max, pe, profiles(nome)")
    .eq("campanha_id", sessao.campanha.id)
    .order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl tracking-wide">{sessao.campanha.nome}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Código de convite:{" "}
          <span className="font-heading text-xl tracking-[0.3em] text-ouro">
            {sessao.campanha.codigo_convite}
          </span>
        </p>
      </div>
      {personagens?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {personagens.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xl">{p.nome}</p>
              <p className="text-base text-muted-foreground">
                {(p.profiles as unknown as { nome: string } | null)?.nome} · Vida {p.vida}/{p.vida_max}{" "}
                · PE {p.pe}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg text-muted-foreground">
          Nenhuma ficha ainda. Passe o código para os jogadores entrarem na mesa.
        </p>
      )}
    </div>
  );
}

export default function MesaPage() {
  return (
    <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando a mesa…</p>}>
      <Painel />
    </Suspense>
  );
}
