import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MesaAoVivo } from "@/components/mesa/MesaAoVivo";
import { carregarMesa } from "@/lib/mesa";
import { obterSessao } from "@/lib/sessao";
import { EsqueletoMesa } from "@/components/Estados";

async function Painel() {
  const sessao = await obterSessao();
  if (sessao?.papel !== "mestre" || !sessao.campanha) redirect("/");

  const campanhaId = sessao.campanha.id;
  const outrasMesas = sessao.mesas.filter((m) => m.papel === "mestre" && m.id !== campanhaId).map((m) => m.id);
  const dados = await carregarMesa(campanhaId, sessao.userId, outrasMesas);
  // remonta a cada carga nova (alguém entrou, morreu, trocou o retrato, ou a Mesa reconectou):
  // o estado da Mesa nasce dos dados do servidor
  const chave = dados.carregadoEm;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">{sessao.campanha.nome}</h1>
        <p className="text-lg text-muted-foreground">
          Código de convite:{" "}
          <span className="font-heading text-xl text-ouro">{sessao.campanha.codigo_convite}</span>
        </p>
      </div>
      <MesaAoVivo key={chave} campanhaId={sessao.campanha.id} inicial={dados} />
    </div>
  );
}

export default function MesaPage() {
  return (
    <Suspense fallback={<EsqueletoMesa />}>
      <Painel />
    </Suspense>
  );
}
