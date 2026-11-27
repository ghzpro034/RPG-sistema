import Link from "next/link";
import { Suspense } from "react";
import { Sigilo } from "@/components/Sigilo";
import { Topo } from "@/components/Topo";
import { obterSessao } from "@/lib/sessao";

async function Usuario() {
  const sessao = await obterSessao();
  return <Topo mesa={sessao?.campanha?.nome ?? null} papel={sessao?.papel ?? null} nome={sessao?.nome ?? null} />;
}

export default function MesaLayout({ children }: { children: React.ReactNode }) {
  return (
    // group/pagina: uma página com data-largura="ampla" (a Mesa) alarga o topo e o conteúdo juntos
    <div className="group/pagina flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-2 sm:py-3">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 group-has-data-[largura=ampla]/pagina:max-w-[1600px]">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 text-ouro">
          <Sigilo className="size-7 sm:size-8" />
          <span className="font-rotulo text-xs leading-tight tracking-[0.2em] uppercase sm:text-sm sm:tracking-[0.3em]">
            A Silent <br className="sm:hidden" />
            Machine
          </span>
        </Link>
        <Suspense>
          <Usuario />
        </Suspense>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 group-has-data-[largura=ampla]/pagina:max-w-[1600px]">
        {children}
      </main>
    </div>
  );
}
