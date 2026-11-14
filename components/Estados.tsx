import { Compass, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

// Estados de tela no mesmo visual em todo o app: esqueletos enquanto carrega e caixas para listas vazias.
// O pulsar dos esqueletos só acontece para quem não pediu menos movimento (motion-safe).

function Bloco({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-muted/60 motion-safe:animate-pulse", className)} />;
}

function Carregando({ rotulo, className, children }: { rotulo: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-6", className)}>
      <p className="font-heading text-xs tracking-[0.3em] text-ouro/80 uppercase">{rotulo}</p>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}

// Lembra o formato da ficha: retrato e nome, vitais, três colunas de atributos e as abas.
export function EsqueletoFicha() {
  return (
    <Carregando rotulo="Carregando a ficha…">
      <div className="flex items-center gap-4">
        <Bloco className="size-24 shrink-0 sm:size-32" />
        <div className="flex flex-1 flex-col gap-3">
          <Bloco className="h-7 w-3/5" />
          <Bloco className="h-4 w-2/5" />
          <Bloco className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Bloco className="h-16" />
        <Bloco className="h-16" />
        <Bloco className="h-16" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Bloco className="h-40" />
        <Bloco className="h-40" />
        <Bloco className="h-40" />
      </div>
      <Bloco className="h-10" />
      <Bloco className="h-48" />
    </Carregando>
  );
}

// Lembra a Mesa: título, cartões das fichas e a coluna das rolagens.
export function EsqueletoMesa() {
  return (
    <Carregando rotulo="Carregando a mesa…">
      <Bloco className="h-9 w-2/3 max-w-sm" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bloco className="h-36" />
          <Bloco className="h-36" />
          <Bloco className="h-36" />
          <Bloco className="h-36" />
        </div>
        <div className="flex flex-col gap-3">
          <Bloco className="h-6 w-1/2" />
          <Bloco className="h-14" />
          <Bloco className="h-14" />
          <Bloco className="h-14" />
        </div>
      </div>
    </Carregando>
  );
}

// Telas de passagem (início, começar): só o aviso, no centro.
export function CarregandoTela() {
  return (
    <p
      role="status"
      className="m-auto font-heading text-xs tracking-[0.3em] text-ouro/80 uppercase motion-safe:animate-pulse"
    >
      Carregando…
    </p>
  );
}

// Listas (Catálogo, Mesas), abaixo do título da página: um botão e algumas linhas.
export function EsqueletoLista({ rotulo }: { rotulo: string }) {
  return (
    <Carregando rotulo={rotulo}>
      <Bloco className="h-10 w-44" />
      <div className="grid gap-3 md:grid-cols-2">
        <Bloco className="h-20" />
        <Bloco className="h-20" />
        <Bloco className="h-20" />
        <Bloco className="h-20" />
      </div>
    </Carregando>
  );
}

// Endereço que não existe ou ficha que não está em nenhuma mesa sua (usado pelos not-found.tsx).
export function NaoEncontrado() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
      <Compass aria-hidden className="size-12 text-ouro/80" />
      <h1 className="font-heading text-xl tracking-[0.15em] uppercase">Nada por aqui</h1>
      <p className="text-lg leading-snug text-muted-foreground">
        Esta página não existe, ou a ficha não está em nenhuma mesa sua.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "h-11 font-heading tracking-wider" })}>
        Voltar ao início
      </Link>
    </div>
  );
}

// Lista vazia: ícone, título curto e o que fazer a seguir.
export function Vazio({
  icone: Icone,
  titulo,
  children,
  compacto,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  children?: React.ReactNode;
  compacto?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border text-center",
        compacto ? "px-3 py-5" : "px-4 py-10",
        className,
      )}
    >
      {Icone && <Icone aria-hidden className={cn("text-ouro/70", compacto ? "size-6" : "size-9")} />}
      <p className="font-heading text-sm tracking-[0.2em] text-ouro uppercase">{titulo}</p>
      {children && <p className="max-w-sm text-lg leading-snug text-muted-foreground">{children}</p>}
    </div>
  );
}
