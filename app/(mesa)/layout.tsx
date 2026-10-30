import Link from "next/link";
import { Suspense } from "react";
import { Topo } from "@/components/Topo";
import { obterSessao } from "@/lib/sessao";

async function Usuario() {
  const sessao = await obterSessao();
  return <Topo mesa={sessao?.campanha?.nome ?? null} papel={sessao?.papel ?? null} nome={sessao?.nome ?? null} />;
}

export default function MesaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:py-3">
        <Link href="/" className="shrink-0 font-heading text-sm tracking-[0.3em] text-ouro">
          GRIMÓRIO
        </Link>
        <Suspense>
          <Usuario />
        </Suspense>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</main>
    </>
  );
}
