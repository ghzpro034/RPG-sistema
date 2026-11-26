// Combate tático (Compêndio, seção 5): grupos A e B, a vez de cada um e a tabela do tiro.

export type GrupoCombate = "a" | "b";

export const NOME_GRUPO: Record<GrupoCombate, string> = { a: "Grupo A", b: "Grupo B" };

/** um passo da ordem do combate; personagem_id nulo é a vez do inimigo */
export type PassoCombate = {
  posicao: number;
  personagem_id: string | null;
  nome: string;
  grupo: GrupoCombate;
};

/** o que estado_do_combate (RPC) devolve: a mesa, a rodada, a vez e a ordem já calculada no banco */
export type EstadoCombate = {
  em_combate: boolean;
  rodada: number;
  vez: number;
  sequencia: PassoCombate[];
  /** grupo de cada personagem da mesa (quem está fora não aparece) */
  grupos: Record<string, GrupoCombate>;
};

export function passoAtual(estado: EstadoCombate | null): PassoCombate | null {
  if (!estado?.sequencia.length) return null;
  return estado.sequencia[Math.min(estado.vez, estado.sequencia.length - 1)];
}

export type TipoTiro = "critico" | "acerto" | "desvantagem" | "erro";

// D8 (ou D6, sem erro): 1 cabeça, 2 torso, 3-4 braços, 5-6 pernas, 7-8 erro
const LOCAIS: Record<number, { local: string; efeito: string; tipo: TipoTiro }> = {
  1: { local: "Cabeça", efeito: "Crítico: dano máximo", tipo: "critico" },
  2: { local: "Torso", efeito: "Acerto", tipo: "acerto" },
  3: { local: "Braço direito", efeito: "Acerto", tipo: "acerto" },
  4: { local: "Braço esquerdo", efeito: "Acerto", tipo: "acerto" },
  5: { local: "Perna direita", efeito: "Acerto com desvantagem no dano", tipo: "desvantagem" },
  6: { local: "Perna esquerda", efeito: "Acerto com desvantagem no dano", tipo: "desvantagem" },
};

export function localDoTiro(resultado: number) {
  return LOCAIS[resultado] ?? { local: "Errou", efeito: "O tiro não acerta", tipo: "erro" as const };
}

export const COR_DO_TIRO: Record<TipoTiro, string> = {
  critico: "text-ouro",
  acerto: "text-estavel",
  desvantagem: "text-ferido",
  erro: "text-instavel",
};

/** modo do dado de dano: perna (desvantagem) rola duas vezes e vale o menor; cabeça (crítico) é o máximo */
export type ModoDano = "normal" | "desvantagem" | "critico";

export const CUSTO_FOCO = -2;
