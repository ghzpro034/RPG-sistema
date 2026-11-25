export type Estado = "Estável" | "Ferido" | "Instável" | "Morrendo";

// Derivado da vida, nunca salvo (Compêndio): 0 Morrendo; abaixo do limiar da ficha Instável;
// abaixo de 50% da vida máxima Ferido; senão Estável.
export function estadoDe(vida: number, vidaMax: number, limiarInstavel: number): Estado {
  if (vida <= 0) return "Morrendo";
  if (vida < limiarInstavel) return "Instável";
  if (vida < metadeDaVida(vidaMax)) return "Ferido";
  return "Estável";
}

// "abaixo de 50%" em número inteiro: com 25 de vida, Ferido é 12 ou menos (menos de 13)
export function metadeDaVida(vidaMax: number) {
  return Math.ceil(vidaMax / 2);
}

export const corDoEstado: Record<Estado, string> = {
  Estável: "text-estavel",
  Ferido: "text-ferido",
  Instável: "text-instavel",
  Morrendo: "text-morrendo",
};

export const fundoDoEstado: Record<Estado, string> = {
  Estável: "bg-estavel",
  Ferido: "bg-ferido",
  Instável: "bg-instavel",
  Morrendo: "bg-morrendo",
};

// o que cada estado impõe em combate (Compêndio)
export const EFEITO_DO_ESTADO: Record<Estado, string> = {
  Estável: "Capacidade total.",
  Ferido: "Desvantagem em ações complexas. Sem Recuperar Foco e sem Preparação Analítica.",
  Instável: "Só ações simples, com desvantagem geral. Qualquer dano leva a vida a 0.",
  Morrendo: "Não age; depende de resgate. Qualquer ataque agora é a morte.",
};
