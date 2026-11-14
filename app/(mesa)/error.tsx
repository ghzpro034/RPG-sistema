"use client";

import { TelaDeErro } from "@/components/TelaDeErro";

// Erro dentro das telas da mesa: o topo continua, só o conteúdo vira a tela de erro.
export default function ErroDaMesa(props: { error: unknown; retry: () => void }) {
  return <TelaDeErro {...props} />;
}
