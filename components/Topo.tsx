import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { sair } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Papel } from "@/lib/sessao";

// Barra do topo: mesa aberta (toque para trocar), atalhos do mestre e sair.
export function Topo({ mesa, papel, nome }: { mesa: string | null; papel: Papel | null; nome: string | null }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-3">
      {mesa && (
        <Link
          href="/mesas"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-10 max-w-44 min-w-0 sm:h-8 sm:max-w-60" })}
        >
          <span className="truncate">{mesa}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Link>
      )}
      {papel === "mestre" && (
        <nav className="flex items-center" aria-label="Mestre">
          <Link href="/mesa" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-10 sm:h-8" })}>
            Painel
          </Link>
          <Link href="/catalogo" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-10 sm:h-8" })}>
            Catálogo
          </Link>
        </nav>
      )}
      <span className="hidden text-base text-muted-foreground lg:inline">{nome}</span>
      <form action={sair}>
        <Button type="submit" variant="ghost" size="sm" className="h-10 sm:h-8">
          Sair
        </Button>
      </form>
    </div>
  );
}
