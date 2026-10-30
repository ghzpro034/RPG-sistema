"use client";

import { Dices, RotateCcw, X } from "lucide-react";
import { cn } from "cn";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFicha } from "@/components/ficha/contexto";
import { Button } from "@/components/ui/button";
import { CUSTO_REFAZER, CUSTO_REFORCAR, type Rolagem } from "@/lib/ficha-tipos";
import { createClient } from "@/lib/supabase/client";

type Contexto = {
  reforcar: boolean;
  setReforcar: (reforcar: boolean) => void;
  rolando: boolean;
  ultima: Rolagem | null;
  historico: Rolagem[];
  rolar: (atributoId: string) => Promise<void>;
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

// O dado é rolado no banco (RPC); aqui só pedimos e mostramos.
export function RoladorProvider({ children }: { children: React.ReactNode }) {
  const { personagem, sincronizar } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const [reforcar, setReforcar] = useState(false);
  const [rolando, setRolando] = useState(false);
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
      .channel(`rolagens-${personagem.id}`)
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

  const rolar = useCallback(
    async (atributoId: string) => {
      setRolando(true);
      const { data, error } = await supabase.rpc("rolar_d100", { p_atributo_id: atributoId, p_reforcar: reforcar });
      setReforcar(false);
      await depoisDaRpc(data, error);
      setRolando(false);
    },
    [supabase, reforcar, depoisDaRpc],
  );

  const refazer = useCallback(async () => {
    if (!ultima) return;
    setRolando(true);
    const { data, error } = await supabase.rpc("refazer", { p_rolagem_id: ultima.id });
    await depoisDaRpc(data, error);
    setRolando(false);
  }, [supabase, ultima, depoisDaRpc]);

  return (
    <RoladorContexto
      value={{ reforcar, setReforcar, rolando, ultima, historico, rolar, refazer, fechar: () => setUltima(null) }}
    >
      {children}
    </RoladorContexto>
  );
}

// Botões do Canva ao lado do losango: Reforçar arma a próxima rolagem, Refazer repete a última.
export function AcoesPE() {
  const { personagem } = useFicha();
  const { reforcar, setReforcar, ultima, refazer, rolando } = useRolador();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={reforcar}
        disabled={personagem.pe < CUSTO_REFORCAR && !reforcar}
        onClick={() => setReforcar(!reforcar)}
        className={cn(
          "rounded-md border px-2.5 py-1 text-left text-base transition-colors disabled:opacity-40",
          reforcar ? "border-ouro bg-ouro/15 text-ouro" : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        Reforçar −{CUSTO_REFORCAR}
      </button>
      <button
        type="button"
        disabled={!ultima || rolando || personagem.pe < CUSTO_REFAZER}
        onClick={refazer}
        className="rounded-md border border-border px-2.5 py-1 text-left text-base text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        Refazer −{CUSTO_REFAZER}
      </button>
    </div>
  );
}

export function Resultado({ rolagem, className }: { rolagem: Rolagem; className?: string }) {
  return (
    <span
      className={cn(
        "font-heading font-bold tabular-nums",
        rolagem.sucesso ? "text-estavel" : "text-instavel",
        className,
      )}
    >
      {rolagem.resultado}
    </span>
  );
}

// Painel do resultado, preso embaixo da tela para aparecer mesmo rolando a página.
export function PainelResultado() {
  const { personagem } = useFicha();
  const { ultima, refazer, rolando, fechar } = useRolador();
  if (!ultima && !rolando) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3" role="status" aria-live="polite">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-card/95 p-4 shadow-2xl shadow-black backdrop-blur">
        {rolando && !ultima ? (
          <p className="flex items-center justify-center gap-2 py-4 font-heading text-lg">
            <Dices className="size-5 animate-spin" /> Rolando…
          </p>
        ) : (
          ultima && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <Resultado rolagem={ultima} className={cn("text-5xl", rolando && "opacity-40")} />
                <span className={cn("font-heading text-sm tracking-widest uppercase", ultima.sucesso ? "text-estavel" : "text-instavel")}>
                  {ultima.sucesso ? "Sucesso" : "Falha"}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-base">
                <p className="font-heading text-lg tracking-wide uppercase">
                  {ultima.atributo} <span className="text-muted-foreground">≤ {ultima.alvo}</span>
                </p>
                {ultima.dados?.length > 1 && (
                  <p className="text-muted-foreground">
                    Reforçado: {ultima.dados.join(" e ")}, vale o menor
                  </p>
                )}
                {ultima.refeitos > 0 && (
                  <p className="text-muted-foreground">Refeito {ultima.refeitos}×</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={rolando || personagem.pe < CUSTO_REFAZER}
                  onClick={refazer}
                >
                  <RotateCcw /> Refazer (−{CUSTO_REFAZER} PE)
                </Button>
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
      <h3 className="font-heading text-xs tracking-[0.25em] text-muted-foreground uppercase">Últimas rolagens</h3>
      <ul className="flex flex-wrap gap-2">
        {historico.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-0.5 text-base">
            <span className="uppercase">{r.atributo}</span>
            <Resultado rolagem={r} />
            <span className="text-muted-foreground">/ {r.alvo}</span>
            {r.reforcado && <span className="text-ouro" title="Reforçado">✦</span>}
            {r.refeitos > 0 && <RotateCcw className="size-3.5 text-muted-foreground" aria-label="Refeito" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
