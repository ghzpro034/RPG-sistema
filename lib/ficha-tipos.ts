export type Travas = { atributos?: boolean; vida_max?: boolean; pe?: boolean };

export type Personagem = {
  id: string;
  campanha_id: string;
  dono_id: string;
  nome: string;
  nivel: string | null;
  retrato_path: string | null;
  descricao: string | null;
  caminho: string | null;
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

export type TipoCarta = "arquetipo" | "trauma" | "habilidade" | "revolta";

export type Carta = {
  id: string;
  tipo: TipoCarta;
  nome: string;
  citacao: string | null;
  efeitos: string[];
  custo: string | null;
  imagem_path: string | null;
  imagemUrl: string | null;
};

export type Raridade = "comum" | "incomum" | "unico";

export type ItemCatalogo = {
  id: string;
  nome: string;
  raridade: Raridade;
  efeito: string | null;
  descricao: string | null;
  max_memorias: number;
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

export type Dado = "d100" | "d20";

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

export const ESPACOS_INVENTARIO = 4;
export const BUCKET_IMAGENS = "imagens";
// URLs assinadas valem uma semana; a página é recarregada bem antes disso
export const VALIDADE_URL = 60 * 60 * 24 * 7;
