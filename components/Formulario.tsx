"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { EstadoForm } from "@/app/actions";

type Props = {
  acao: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  botao: string;
  children: React.ReactNode;
};

// Formulário ligado a uma server action, com erro e estado de envio.
export function Formulario({ acao, botao, children }: Props) {
  const [estado, enviar, enviando] = useActionState(acao, undefined);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {children}
      {estado?.erro && (
        <p role="alert" className="text-base text-instavel">
          {estado.erro}
        </p>
      )}
      <Button type="submit" size="lg" disabled={enviando} className="font-heading tracking-wider">
        {enviando ? "Aguarde…" : botao}
      </Button>
    </form>
  );
}
