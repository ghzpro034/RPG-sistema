"use client";

import { RotateCcw, Skull, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { assinarConexao, lerConexao } from "@/components/SemInternet";

// Tela usada pelos error.tsx: explica o que houve e oferece tentar de novo ou voltar ao início.
export function TelaDeErro({ error, retry }: { error: unknown; retry: () => void }) {
  const online = useSyncExternalStore(assinarConexao, lerConexao, () => true);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const Icone = online ? Skull : WifiOff;
  const codigo = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div role="alert" className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
      <Icone aria-hidden className="size-12 text-destructive" />
      <h1 className="font-heading text-xl tracking-[0.15em] uppercase">
        {online ? "Algo deu errado" : "Sem internet"}
      </h1>
      <p className="text-lg leading-snug text-muted-foreground">
        {online
          ? "Não foi possível carregar esta página. Tente de novo; se continuar, avise o mestre."
          : "O celular está sem conexão. Quando a internet voltar, toque em tentar de novo."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" className="h-11 font-heading tracking-wider" onClick={() => retry()}>
          <RotateCcw /> Tentar de novo
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11" })}>
          Voltar ao início
        </Link>
      </div>
      {codigo && <p className="text-sm text-muted-foreground/70">Código do erro: {codigo}</p>}
    </div>
  );
}
