export type Estado = "Estável" | "Ferido" | "Instável";

// Derivado da vida, nunca salvo: < 5 Instável, < 10 Ferido, senão Estável.
export function estadoDe(vida: number): Estado {
  if (vida < 5) return "Instável";
  if (vida < 10) return "Ferido";
  return "Estável";
}

export const corDoEstado: Record<Estado, string> = {
  Estável: "text-estavel",
  Ferido: "text-ferido",
  Instável: "text-instavel",
};

export const fundoDoEstado: Record<Estado, string> = {
  Estável: "bg-estavel",
  Ferido: "bg-ferido",
  Instável: "bg-instavel",
};
