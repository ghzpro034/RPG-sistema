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
  defesa: number;
  corrupcao: number;
  congelado: number;
  /** moeda do RPG; 0 enquanto a migration da moeda não roda */
  dentes: number;
  pe: number;
  pe_max: number;
  conhecimentos: string[];
  enganou_morte: boolean;
  travas: Travas;
};

export type Grupo = "forca" | "mental" | "social";

export type Atributo = {
  id: string;
  grupo: Grupo;
  nome: string;
  valor: number;
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
  imagemUrl: string | null;
};

export type Raridade = "comum" | "incomum" | "unico";

export type ItemInventario = {
  id: string;
  quantidade: number;
  memorias_desbloqueadas: number;
  item: {
    id: string;
    nome: string;
    raridade: Raridade;
    efeito: string | null;
    descricao: string | null;
    max_memorias: number;
    imagemUrl: string | null;
  };
};

export type Rolagem = {
  id: string;
  campanha_id: string;
  personagem_id: string;
  atributo: string;
  alvo: number;
  resultado: number;
  sucesso: boolean;
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
  souMestre: boolean;
};

export const ESPACOS_INVENTARIO = 4;
// passou disso, o personagem congela no frio
export const LIMITE_CONGELADO = 10;
export const BUCKET_IMAGENS = "imagens";
// URLs assinadas valem uma semana; a página é recarregada bem antes disso
export const VALIDADE_URL = 60 * 60 * 24 * 7;
