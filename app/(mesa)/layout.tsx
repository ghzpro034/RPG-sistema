import { Suspense } from "react";
import { sair } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { obterSessao } from "@/lib/sessao";

async function Usuario() {
  const sessao = await obterSessao();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-base text-muted-foreground sm:inline">
        {sessao?.nome}
        {sessao?.papel === "mestre" && " · Mestre"}
      </span>
      <form action={sair}>
        <Button type="submit" variant="ghost" size="sm">
          Sair
        </Button>
      </form>
    </div>
  );
}

export default function MesaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-heading text-sm tracking-[0.3em] text-ouro">GRIMÓRIO</span>
        <Suspense>
          <Usuario />
        </Suspense>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">{children}</main>
    </>
  );
}
