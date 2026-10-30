"use client";

import { Lock, Minus, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Travado({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Lock className="size-3.5" aria-hidden />
      Travado pelo mestre
    </span>
  );
}

// Texto que vira campo no modo edição e salva ao sair do campo.
export function TextoEditavel({
  valor,
  aoSalvar,
  editavel,
  rotulo,
  multilinha,
  placeholder,
  className,
  campoClassName,
}: {
  valor: string;
  aoSalvar: (valor: string) => void;
  editavel: boolean;
  rotulo: string;
  multilinha?: boolean;
  placeholder?: string;
  className?: string;
  campoClassName?: string;
}) {
  if (!editavel) {
    return valor ? (
      <p className={cn("whitespace-pre-line", className)}>{valor}</p>
    ) : (
      <p className={cn("text-muted-foreground italic", className)}>{placeholder}</p>
    );
  }

  const aoSair = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const novo = e.currentTarget.value.trim();
    if (novo !== valor) aoSalvar(novo);
  };
  const props = { defaultValue: valor, onBlur: aoSair, "aria-label": rotulo, placeholder };

  // key: se o banco recusar e o valor voltar, o campo mostra o valor certo
  return multilinha ? (
    <Textarea key={valor} {...props} className={cn("min-h-20 text-lg md:text-lg", campoClassName)} />
  ) : (
    <Input key={valor} {...props} className={cn("h-10 text-lg md:text-lg", campoClassName)} />
  );
}

// Número com − e +, com botões grandes para o dedo.
export function Contador({
  valor,
  aoMudar,
  rotulo,
  min = 0,
  max,
  desabilitado,
  tamanho = "md",
}: {
  valor: number;
  aoMudar: (valor: number) => void;
  rotulo: string;
  min?: number;
  max?: number;
  desabilitado?: boolean;
  tamanho?: "md" | "lg";
}) {
  const botao = tamanho === "lg" ? "size-11" : "size-9";
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className={botao}
        aria-label={`Diminuir ${rotulo}`}
        disabled={desabilitado || valor <= min}
        onClick={() => aoMudar(valor - 1)}
      >
        <Minus />
      </Button>
      <span
        className={cn(
          "min-w-10 text-center font-heading tabular-nums",
          tamanho === "lg" ? "text-3xl" : "text-xl",
        )}
        aria-live="polite"
      >
        {valor}
      </span>
      <Button
        type="button"
        variant="outline"
        className={botao}
        aria-label={`Aumentar ${rotulo}`}
        disabled={desabilitado || (max !== undefined && valor >= max)}
        onClick={() => aoMudar(valor + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
