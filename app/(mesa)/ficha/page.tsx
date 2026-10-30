import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Companheiros } from "@/components/ficha/Companheiros";
import { Ficha } from "@/components/ficha/Ficha";
import { carregarFicha } from "@/lib/ficha";
import { obterSessao } from "@/lib/sessao";

async function MinhaFicha() {
  const sessao = await obterSessao();
  if (!sessao?.personagemId || !sessao.campanha) redirect("/");

  const dados = await carregarFicha(sessao.personagemId, sessao.papel === "mestre");
  if (!dados) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      {/* os colegas carregam à parte, para não atrasar a ficha */}
      <Suspense>
        <Companheiros campanhaId={sessao.campanha.id} />
      </Suspense>
      <Ficha dados={dados} />
    </div>
  );
}

export default function FichaPage() {
  return (
    <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando a ficha…</p>}>
      <MinhaFicha />
    </Suspense>
  );
}
