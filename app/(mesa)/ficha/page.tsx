import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Ficha } from "@/components/ficha/Ficha";
import { carregarFicha } from "@/lib/ficha";
import { obterSessao } from "@/lib/sessao";

async function MinhaFicha() {
  const sessao = await obterSessao();
  if (!sessao?.personagemId) redirect("/");

  const dados = await carregarFicha(sessao.personagemId, sessao.papel === "mestre");
  if (!dados) redirect("/");

  return <Ficha dados={dados} />;
}

export default function FichaPage() {
  return (
    <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando a ficha…</p>}>
      <MinhaFicha />
    </Suspense>
  );
}
