import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Catalogo } from "@/components/catalogo/Catalogo";
import { carregarCatalogo } from "@/lib/conteudo";
import { obterSessao } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

// Mestre: cria e edita os itens e as cartas (um catálogo só, para todas as mesas dele).
async function ConteudoCatalogo() {
  const sessao = await obterSessao();
  if (sessao?.papel !== "mestre" || !sessao.campanha) redirect("/");

  // um catálogo só do mestre, valendo em todas as mesas dele
  const dados = await carregarCatalogo(await createClient(), sessao.userId);
  return <Catalogo mestreId={sessao.userId} inicial={dados} />;
}

export default function CatalogoPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-wide uppercase">Catálogo</h1>
      <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando o catálogo…</p>}>
        <ConteudoCatalogo />
      </Suspense>
    </div>
  );
}
