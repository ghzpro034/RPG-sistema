export type Travas = { atributos?: boolean; vida_max?: boolean; pe?: boolean };

export type Personagem = {
  id: string;
  campanha_id: string;
  dono_id: string;
  nome: string;
  nivel: string | null;
  retrato_path: string | null;
  descricao: string | null;
  /** Amor, Revolta ou Absurdo; só o mestre muda */
  caminho: Caminho | null;
  vida: number;
  vida_max: number;
  /** Pontos de Proteção (armadura); a coluna se chama defesa desde o sistema antigo */
  defesa: number;
  corrupcao: number;
  congelado: number;
  /** congela no frio quando passa deste número (cada ficha tem o seu) */
  limite_congelado: number;
  /** abaixo disto o personagem fica Instável (o Ferido é automático, abaixo de 50% da vida) */
  limiar_instavel: number;
  /** características em %: o D100 rola contra elas; o mestre digita */
  vigor: number;
  mental: number;
  social: number;
  /** pontos de Sinergia: pagam as habilidades de Caminho */
  sinergia: number;
  /** espaços do inventário por raridade (Compêndio); só o mestre muda */
  espacos_comum: number;
  espacos_incomum: number;
  espacos_unico: number;
  raca: Raca | null;
  /** moeda do RPG; 0 enquanto a migration da moeda não roda */
  dentes: number;
  pe: number;
  pe_max: number;
  conhecimentos: string[];
  enganou_morte: boolean;
  travas: Travas;
  /** preenchido quando o mestre registra a morte: a ficha vai para o memorial, só leitura */
  morto_em: string | null;
  epitafio: string | null;
};

export type Raca = "errante" | "palido" | "sanguineo";

export type Caminho = "amor" | "revolta" | "absurdo";

export const CAMINHOS: { valor: Caminho; nome: string }[] = [
  { valor: "amor", nome: "Amor" },
  { valor: "revolta", nome: "Revolta" },
  { valor: "absurdo", nome: "Absurdo" },
];

export const nomeDoCaminho = (c: Caminho | null) => CAMINHOS.find((x) => x.valor === c)?.nome ?? null;

export const RACAS: { valor: Raca; nome: string }[] = [
  { valor: "errante", nome: "Errante" },
  { valor: "palido", nome: "Pálido" },
  { valor: "sanguineo", nome: "Sanguíneo" },
];

/** as três características; cada especialização pertence a uma delas */
export type Grupo = "vigor" | "mental" | "social";

/** uma especialização (Força, Vasculhar, Lábia…): o D20 rola nela */
export type Atributo = {
  id: string;
  grupo: Grupo;
  nome: string;
  valor: number;
  /** bônus fixo no D20 (ex.: +2 de um arquétipo) */
  bonus: number;
  ordem: number;
};

/** habilidade = habilidade única (uma por personagem); caminho = habilidade de Caminho (paga em Sinergia) */
export type TipoCarta = "arquetipo" | "trauma" | "habilidade" | "caminho";

export type Carta = {
  id: string;
  tipo: TipoCarta;
  nome: string;
  citacao: string | null;
  efeitos: string[];
  /** custo antigo em texto livre; as cartas novas usam custo_pe e custo_sinergia */
  custo: string | null;
  custo_pe: number;
  custo_sinergia: number;
  /** só nas cartas de caminho */
  caminho: Caminho | null;
  nivel: string | null;
  /** arte embutida no app (/cartas/{arte}.webp), usada quando o mestre não enviou imagem */
  arte: string | null;
  imagem_path: string | null;
  imagemUrl: string | null;
};

/** Compêndio: até 3 arquétipos e uma habilidade única por personagem */
export const MAX_ARQUETIPOS = 3;

export type UsoCarta = {
  id: string;
  campanha_id: string;
  personagem_id: string;
  carta_id: string | null;
  nome: string;
  /** acao: Recuperar Foco (custo_pe negativo = PE ganho) */
  tipo: TipoCarta | "acao";
  custo_pe: number;
  custo_sinergia: number;
  created_at: string;
};

export type Raridade = "comum" | "incomum" | "unico";

export const RARIDADES: { valor: Raridade; nome: string; cor: string; fundo: string; borda: string }[] = [
  { valor: "comum", nome: "Comum", cor: "text-comum", fundo: "bg-comum", borda: "border-comum" },
  { valor: "incomum", nome: "Incomum", cor: "text-incomum", fundo: "bg-incomum", borda: "border-incomum" },
  { valor: "unico", nome: "Único", cor: "text-unico", fundo: "bg-unico", borda: "border-unico" },
];

/** Compêndio: quantas memórias (estrelas ★) uma arma pode ter, pela raridade */
export const MAX_MEMORIAS: Record<Raridade, number> = { comum: 1, incomum: 3, unico: 5 };

/** a coluna de espaços da ficha para cada raridade */
export const COLUNA_ESPACOS: Record<Raridade, "espacos_comum" | "espacos_incomum" | "espacos_unico"> = {
  comum: "espacos_comum",
  incomum: "espacos_incomum",
  unico: "espacos_unico",
};

/** uma memória de arma: nome, descrição e efeito, na ordem em que se desbloqueia */
export type MemoriaItem = {
  id: string;
  ordem: number;
  nome: string;
  descricao: string | null;
  efeito: string | null;
};

export type ItemCatalogo = {
  id: string;
  nome: string;
  raridade: Raridade;
  /** dado de dano ("D10", "2D10") */
  dano: string | null;
  /** bônus ou efeito ("+6 de Resistência", "+3 de Cura") */
  efeito: string | null;
  descricao: string | null;
  /** quem fez o item ("Lucius Francis") */
  criador: string | null;
  /** quantas memórias este item tem (até MAX_MEMORIAS da raridade) */
  max_memorias: number;
  memorias: MemoriaItem[];
  imagem_path: string | null;
  imagemUrl: string | null;
};

export type ItemInventario = {
  id: string;
  quantidade: number;
  memorias_desbloqueadas: number;
  item: ItemCatalogo;
};

export type FormaGraca = "circulo" | "quadrado" | "triangulo" | "estrela";

export type Graca = {
  id: string;
  personagem_id: string;
  forma: FormaGraca;
  nome: string | null;
  descricao: string | null;
};

/** d100/d20: testes; tiro: D8 ou D6 (alvo = faces); dano: o dado do item (bonus = o fixo, resultado = o total) */
export type Dado = "d100" | "d20" | "tiro" | "dano";

export type Rolagem = {
  id: string;
  campanha_id: string;
  personagem_id: string;
  /** D100: na característica (passa com resultado ≤ alvo). D20: na especialização (soma o bônus; o mestre julga) */
  dado: Dado;
  /** nome da característica ou da especialização */
  atributo: string;
  /** D100: o valor da característica. D20: o valor da especialização, só para referência */
  alvo: number;
  /** o dado que valeu (D100: o menor; D20: o maior) */
  resultado: number;
  bonus: number;
  /** só no D100; no D20 quem decide é o mestre */
  sucesso: boolean | null;
  /** os dados da última jogada: 1, ou 2 quando reforçada */
  dados: number[];
  reforcado: boolean;
  refeitos: number;
  /** "Reforçado", "Refeito", "D6", "Crítico", "Desvantagem" */
  modificadores: string[];
  created_at: string;
};

export const CUSTO_REFORCAR = 1;
export const CUSTO_REFAZER = 2;

export type DadosFicha = {
  personagem: Personagem;
  retratoUrl: string | null;
  atributos: Atributo[];
  cartas: Carta[];
  inventario: ItemInventario[];
  gracas: Graca[];
  /** cartas do catálogo da campanha, para o mestre dar ao personagem (vazio para o player) */
  catalogoCartas: Carta[];
  /** mesa aberta agora: a rolagem aparece nela (a ficha pode estar em várias) */
  campanhaAtual: string;
  souMestre: boolean;
};

export const BUCKET_IMAGENS = "imagens";
// URLs assinadas valem uma semana; a página é recarregada bem antes disso
export const VALIDADE_URL = 60 * 60 * 24 * 7;
