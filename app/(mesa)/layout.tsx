import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { sair } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { obterSessao } from "@/lib/sessao";

async function Usuario() {
  const sessao = await obterSessao();
  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      {/* mesa aberta; toque para trocar ou criar outra */}
      {sessao?.campanha && (
        <Link
          href="/mesas"
          className={buttonVariants({ variant: "outline", size: "sm", className: "max-w-40 min-w-0 sm:max-w-60" })}
        >
          <span className="truncate">{sessao.campanha.nome}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Link>
      )}
      {sessao?.papel === "mestre" && (
        <nav className="flex items-center" aria-label="Mestre">
          <Link href="/mesa" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Painel
          </Link>
          <Link href="/catalogo" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Catálogo
          </Link>
        </nav>
      )}
      <span className="hidden text-base text-muted-foreground lg:inline">{sessao?.nome}</span>
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
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
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
