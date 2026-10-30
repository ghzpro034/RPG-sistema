import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MesaAoVivo } from "@/components/mesa/MesaAoVivo";
import { carregarMesa } from "@/lib/mesa";
import { obterSessao } from "@/lib/sessao";

async function Painel() {
  const sessao = await obterSessao();
  if (sessao?.papel !== "mestre" || !sessao.campanha) redirect("/");

  const dados = await carregarMesa(sessao.campanha.id);
  // remonta quando muda quem está na mesa ou um retrato (o servidor manda os dados novos)
  const chave = dados.personagens.map((p) => `${p.id}:${p.retrato_path}`).join("|");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-wide uppercase">{sessao.campanha.nome}</h1>
        <p className="text-lg text-muted-foreground">
          Código de convite:{" "}
          <span className="font-heading text-xl tracking-[0.3em] text-ouro">{sessao.campanha.codigo_convite}</span>
        </p>
      </div>
      <MesaAoVivo key={chave} campanhaId={sessao.campanha.id} inicial={dados} />
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
