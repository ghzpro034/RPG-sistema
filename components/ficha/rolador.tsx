"use client";

import { Dices, RotateCcw, X } from "lucide-react";
import { cn } from "cn";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { COR_DO_TIRO, localDoTiro, type ModoDano } from "@/lib/combate";
import { CUSTO_REFAZER, CUSTO_REFORCAR, type Grupo, type Rolagem } from "@/lib/ficha-tipos";
import { createClient, nomeCanal } from "@/lib/supabase/client";

type Contexto = {
  reforcar: boolean;
  setReforcar: (reforcar: boolean) => void;
  rolando: boolean;
  /** o dado girando na tela (faces), enquanto o banco sorteia; nulo quando parado */
  girando: { faces: number } | null;
  ultima: Rolagem | null;
  historico: Rolagem[];
  /** D100 numa característica (Vigor, Mental, Social) */
  rolarD100: (caracteristica: Grupo) => Promise<void>;
  /** D20 numa especialização */
  rolarD20: (atributoId: string) => Promise<void>;
  /** tiro: D8 (pode errar) ou D6 (atirador focado / arma avançada) */
  rolarTiro: (d6: boolean) => Promise<void>;
  /** o dado de dano de um item do inventário (faces: para a animação, ex.: 10 no "2D10") */
  rolarDano: (inventarioId: string, modo: ModoDano, faces?: number) => Promise<void>;
  /** +2 PE (só Estável; O Órfão também quando Ferido) */
  recuperarFoco: () => Promise<void>;
  refazer: () => Promise<void>;
  fechar: () => void;
};

const RoladorContexto = createContext<Contexto | null>(null);

export function useRolador() {
  const ctx = use(RoladorContexto);
  if (!ctx) throw new Error("useRolador fora de <RoladorProvider>");
  return ctx;
}

// junta a rolagem nova (ou refeita) na lista, mais recente primeiro
function mesclar(lista: Rolagem[], rolagem: Rolagem) {
  return [rolagem, ...lista.filter((r) => r.id !== rolagem.id)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
}

// quanto tempo, no mínimo, o dado fica girando: o banco às vezes responde rápido demais para parecer um dado
const GIRO_MINIMO = 650;

/** quem pediu menos movimento no aparelho não vê o dado girar: o resultado aparece direto */
function menosMovimento() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const esperar = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

// O dado é rolado no banco (RPC); aqui só pedimos e mostramos.
export function RoladorProvider({ campanhaAtual, children }: { campanhaAtual: string; children: React.ReactNode }) {
  const { personagem, sincronizar } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const [reforcar, setReforcar] = useState(false);
  const [rolando, setRolando] = useState(false);
  const [girando, setGirando] = useState<{ faces: number } | null>(null);
  const [ultima, setUltima] = useState<Rolagem | null>(null);
  const [historico, setHistorico] = useState<Rolagem[]>([]);

  useEffect(() => {
    let ativo = true;
    void supabase
      .from("rolagens")
      .select("*")
      .eq("personagem_id", personagem.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => ativo && setHistorico((data ?? []) as Rolagem[]));

    // rolagens feitas pelo mestre para este personagem também aparecem
    const canal = supabase
      .channel(nomeCanal(`rolagens-${personagem.id}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rolagens", filter: `personagem_id=eq.${personagem.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const rolagem = payload.new as Rolagem;
          setHistorico((lista) => mesclar(lista, rolagem));
          setUltima((atual) => (atual?.id === rolagem.id ? rolagem : atual));
        },
      )
      .subscribe();
    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [supabase, personagem.id]);

  const depoisDaRpc = useCallback(
    async (data: unknown, error: { message: string } | null) => {
      if (error || !data) {
        toast.error(error?.message ?? "Não foi possível rolar");
        return;
      }
      const rolagem = data as Rolagem;
      setUltima(rolagem);
      setHistorico((lista) => mesclar(lista, rolagem));
      await sincronizar();
    },
    [sincronizar],
  );

  // gira o dado enquanto o banco sorteia; o resultado só aparece (na tela e nas últimas rolagens) quando ele para
  const comDado = useCallback(
    async (faces: number, pedido: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
      const inicio = performance.now();
      setRolando(true);
      setGirando({ faces });
      const { data, error } = await pedido();
      if (!error && !menosMovimento()) await esperar(GIRO_MINIMO - (performance.now() - inicio));
      setGirando(null);
      await depoisDaRpc(data, error);
      setRolando(false);
    },
    [depoisDaRpc],
  );

  const pedir = useCallback(
    async (rpc: "rolar_d100" | "rolar_d20", args: Record<string, unknown>) => {
      await comDado(rpc === "rolar_d20" ? 20 : 100, () =>
        supabase.rpc(rpc, { ...args, p_reforcar: reforcar, p_campanha: campanhaAtual }),
      );
      setReforcar(false);
    },
    [supabase, reforcar, campanhaAtual, comDado],
  );
  const rolarD100 = useCallback(
    (caracteristica: Grupo) => pedir("rolar_d100", { p_personagem: personagem.id, p_caracteristica: caracteristica }),
    [pedir, personagem.id],
  );
  const rolarD20 = useCallback((atributoId: string) => pedir("rolar_d20", { p_atributo_id: atributoId }), [pedir]);

  // tiro e dano não usam o Reforçar: ele continua armado para o próximo teste
  const pedirSemReforco = useCallback(
    (faces: number, rpc: "rolar_tiro" | "rolar_dano", args: Record<string, unknown>) =>
      comDado(faces, () => supabase.rpc(rpc, { ...args, p_campanha: campanhaAtual })),
    [supabase, campanhaAtual, comDado],
  );
  const rolarTiro = useCallback(
    (d6: boolean) => pedirSemReforco(d6 ? 6 : 8, "rolar_tiro", { p_personagem: personagem.id, p_d6: d6 }),
    [pedirSemReforco, personagem.id],
  );
  const rolarDano = useCallback(
    (inventarioId: string, modo: ModoDano, faces = 10) =>
      pedirSemReforco(faces, "rolar_dano", { p_inventario: inventarioId, p_modo: modo }),
    [pedirSemReforco],
  );

  const recuperarFoco = useCallback(async () => {
    setRolando(true);
    const { data, error } = await supabase.rpc("recuperar_foco", { p_personagem: personagem.id, p_campanha: campanhaAtual });
    setRolando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Foco recuperado: +${-(data as { custo_pe: number }).custo_pe} PE`);
    await sincronizar();
  }, [supabase, personagem.id, campanhaAtual, sincronizar]);

  const refazer = useCallback(async () => {
    if (!ultima) return;
    const faces = ultima.dado === "d20" ? 20 : ultima.dado === "tiro" ? ultima.alvo : 100;
    await comDado(faces, () => supabase.rpc("refazer", { p_rolagem_id: ultima.id }));
  }, [supabase, ultima, comDado]);

  return (
    <RoladorContexto
      value={{
        reforcar,
        setReforcar,
        rolando,
        girando,
        ultima,
        historico,
        rolarD100,
        rolarD20,
        rolarTiro,
        rolarDano,
        recuperarFoco,
        refazer,
        fechar: () => setUltima(null),
      }}
    >
      {children}
    </RoladorContexto>
  );
}

// Botões do Canva ao lado do losango: Reforçar arma a próxima rolagem, Refazer repete a última.
export function AcoesPE() {
  const { personagem, morto } = useFicha();
  const { reforcar, setReforcar, ultima, refazer, rolando } = useRolador();
  if (morto) return null;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={reforcar}
        disabled={personagem.pe < CUSTO_REFORCAR && !reforcar}
        onClick={() => setReforcar(!reforcar)}
        className={cn(
          "min-h-11 rounded-md border px-3 text-left text-base transition-colors disabled:opacity-40",
          reforcar ? "border-ouro bg-ouro/15 text-ouro" : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        Reforçar −{CUSTO_REFORCAR}
      </button>
      <button
        type="button"
        disabled={!ultima || ultima.dado === "dano" || rolando || personagem.pe < CUSTO_REFAZER}
        onClick={refazer}
        className="min-h-11 rounded-md border border-border px-3 text-left text-base text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        Refazer −{CUSTO_REFAZER}
      </button>
    </div>
  );
}

// D20: o total (dado + bônus), em dourado, porque quem julga é o mestre. D100: verde ou vermelho.
export function totalDe(rolagem: Rolagem) {
  return rolagem.dado === "d20" ? rolagem.resultado + (rolagem.bonus ?? 0) : rolagem.resultado;
}

// a cor do número: D20 dourado (o mestre julga), D100 verde/vermelho, tiro pelo local, dano vermelho
function corDe(rolagem: Rolagem) {
  if (rolagem.dado === "d20") return "text-ouro";
  if (rolagem.dado === "tiro") return COR_DO_TIRO[localDoTiro(rolagem.resultado).tipo];
  if (rolagem.dado === "dano") return "text-instavel";
  return rolagem.sucesso ? "text-estavel" : "text-instavel";
}

/** o que vai embaixo do número: Sucesso/Falha, D20, o local do tiro ou "Dano" */
export function rotuloDe(rolagem: Rolagem) {
  if (rolagem.dado === "d20") return "D20";
  if (rolagem.dado === "tiro") return localDoTiro(rolagem.resultado).local;
  if (rolagem.dado === "dano") return "Dano";
  return rolagem.sucesso ? "Sucesso" : "Falha";
}

/** o detalhe da linha: a conta do dano, o efeito do tiro */
export function detalheDe(rolagem: Rolagem) {
  if (rolagem.dado === "tiro") return `D${rolagem.alvo} · ${localDoTiro(rolagem.resultado).efeito}`;
  if (rolagem.dado === "dano") {
    const conta = [...(rolagem.dados ?? []), ...(rolagem.bonus ? [rolagem.bonus] : [])].join(" + ");
    const modo = rolagem.modificadores?.find((m) => m === "Crítico" || m === "Desvantagem");
    const textoModo = modo === "Crítico" ? "crítico (máximo)" : modo === "Desvantagem" ? "desvantagem (vale o menor)" : null;
    return [conta, textoModo].filter(Boolean).join(" · ");
  }
  return null;
}

export function Resultado({ rolagem, className }: { rolagem: Rolagem; className?: string }) {
  return (
    <span className={cn("font-sans font-bold tabular-nums", corDe(rolagem), className)}>
      {totalDe(rolagem)}
    </span>
  );
}

// "14 + 2" no D20 com bônus; nada no D100 nem no D20 sem bônus
function contaDoD20(rolagem: Rolagem) {
  if (rolagem.dado !== "d20" || !rolagem.bonus) return null;
  return `${rolagem.resultado} ${rolagem.bonus > 0 ? "+" : "−"} ${Math.abs(rolagem.bonus)}`;
}

// O dado chacoalhando, com números trocando dentro da faixa dele, enquanto o banco sorteia.
function DadoGirando({ faces }: { faces: number }) {
  const [valor, setValor] = useState(faces);
  useEffect(() => {
    if (menosMovimento()) return;
    const relogio = setInterval(() => setValor(1 + Math.floor(Math.random() * faces)), 70);
    return () => clearInterval(relogio);
  }, [faces]);
  return (
    <div className="flex items-center gap-4 py-1">
      <span
        className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-2 border-ouro bg-ouro/10 font-sans text-4xl font-bold text-ouro tabular-nums shadow-[0_0_24px] shadow-ouro/30 motion-safe:animate-chacoalhar"
        aria-hidden
      >
        {valor}
      </span>
      <p className="flex items-center gap-2 font-rotulo text-base tracking-[0.2em] uppercase">
        <Dices className="size-5 text-ouro motion-safe:animate-spin" aria-hidden /> Rolando o D{faces}…
      </p>
    </div>
  );
}

// Painel do resultado, preso embaixo da tela para aparecer mesmo rolando a página.
export function PainelResultado() {
  const { personagem } = useFicha();
  const { ultima, refazer, rolando, girando, fechar } = useRolador();
  if (!ultima && !girando) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-card/95 p-4 shadow-2xl shadow-black backdrop-blur">
        {girando ? (
          <DadoGirando faces={girando.faces} />
        ) : (
          ultima && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <Resultado
                  key={`${ultima.id}-${ultima.refeitos}`}
                  rolagem={ultima}
                  className="inline-block text-5xl motion-safe:animate-revelar"
                />
                <span className={cn("max-w-24 text-center font-rotulo text-sm tracking-widest uppercase", corDe(ultima))}>
                  {rotuloDe(ultima)}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-base">
                <p className="font-rotulo text-lg tracking-wide uppercase">
                  {ultima.atributo}{" "}
                  {ultima.dado === "d100" && <span className="text-muted-foreground">≤ {ultima.alvo}</span>}
                </p>
                {contaDoD20(ultima) && <p className="text-muted-foreground">Dado {contaDoD20(ultima)} de bônus</p>}
                {ultima.dado === "d20" && <p className="text-muted-foreground">O mestre diz se passou.</p>}
                {detalheDe(ultima) && <p className="text-muted-foreground">{detalheDe(ultima)}</p>}
                {ultima.dado !== "dano" && ultima.dados?.length > 1 && (
                  <p className="text-muted-foreground">
                    Reforçado: {ultima.dados.join(" e ")}, vale o {ultima.dado === "d20" ? "maior" : "menor"}
                  </p>
                )}
                {ultima.refeitos > 0 && (
                  <p className="text-muted-foreground">Refeito {ultima.refeitos}×</p>
                )}
                {/* o dano não se refaz */}
                {ultima.dado !== "dano" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={rolando || personagem.pe < CUSTO_REFAZER}
                    onClick={refazer}
                  >
                    <RotateCcw /> Refazer (−{CUSTO_REFAZER} PE)
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon-lg" aria-label="Fechar resultado" onClick={fechar} className="self-start">
                <X />
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function UltimasRolagens() {
  const { historico } = useRolador();
  if (!historico.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-rotulo text-xs tracking-[0.25em] text-muted-foreground uppercase">Últimas rolagens</h3>
      <ul className="flex flex-wrap gap-2">
        {historico.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-0.5 text-base">
            <span className="uppercase">{r.atributo}</span>
            <Resultado rolagem={r} />
            <span className="text-muted-foreground">
              {r.dado === "d20" ? "D20" : r.dado === "d100" ? `/ ${r.alvo}` : rotuloDe(r)}
            </span>
            {r.reforcado && <span className="text-ouro" title="Reforçado">✦</span>}
            {r.refeitos > 0 && <RotateCcw className="size-3.5 text-muted-foreground" aria-label="Refeito" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
