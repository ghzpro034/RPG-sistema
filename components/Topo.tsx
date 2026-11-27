import { BookOpen, ChevronsUpDown, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { BotaoSair } from "@/components/BotaoSair";
import { buttonVariants } from "@/components/ui/button";
import type { Papel } from "@/lib/sessao";

// Barra do topo: mesa aberta (toque para trocar), atalhos do mestre e sair.
export function Topo({ mesa, papel, nome }: { mesa: string | null; papel: Papel | null; nome: string | null }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-3">
      {mesa && (
        <Link
          href="/mesas"
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 max-w-36 min-w-0 sm:h-8 sm:max-w-60" })}
        >
          <span className="truncate">{mesa}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Link>
      )}
      {papel === "mestre" && (
        <nav className="flex items-center" aria-label="Mestre">
          {/* no celular só os ícones, para o topo caber numa linha; o nome fica para leitores de tela */}
          <Link href="/mesa" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-11 min-w-11 sm:h-8 sm:min-w-0" })}>
            <LayoutDashboard className="sm:hidden" aria-hidden />
            <span className="sr-only sm:not-sr-only">Painel</span>
          </Link>
          <Link href="/catalogo" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-11 min-w-11 sm:h-8 sm:min-w-0" })}>
            <BookOpen className="sm:hidden" aria-hidden />
            <span className="sr-only sm:not-sr-only">Catálogo</span>
          </Link>
        </nav>
      )}
      <span className="hidden text-base text-muted-foreground lg:inline">{nome}</span>
      <BotaoSair />
    </div>
  );
}
