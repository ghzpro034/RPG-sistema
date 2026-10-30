import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Ficha } from "@/components/ficha/Ficha";
import { carregarFicha } from "@/lib/ficha";
import { obterSessao } from "@/lib/sessao";

// Mestre: abre e edita a ficha de qualquer personagem da mesa.
async function FichaDoMestre({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, sessao] = await Promise.all([params, obterSessao()]);
  if (sessao?.papel !== "mestre" || !sessao.campanha) redirect("/");

  // o RLS só devolve fichas que estão em alguma mesa deste mestre
  const dados = await carregarFicha(id, { mestreId: sessao.userId, campanhaAtual: sessao.campanha.id });
  if (!dados) notFound();

  return <Ficha dados={dados} />;
}

export default function FichaDoMestrePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex flex-col gap-2">
      <Link href="/mesa" className="flex items-center gap-1.5 self-start text-lg text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar à mesa
      </Link>
      <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando a ficha…</p>}>
        <FichaDoMestre params={params} />
      </Suspense>
    </div>
  );
}
