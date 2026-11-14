"use client";

import { TelaDeErro } from "@/components/TelaDeErro";

// Erro nas telas fora da mesa (início, começar, entrar, cadastro).
export default function Erro(props: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center px-4">
      <TelaDeErro {...props} />
    </main>
  );
}
