"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Personagem, Travas } from "@/lib/ficha-tipos";

export type StatusSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

type Contexto = {
  personagem: Personagem;
  souMestre: boolean;
  editando: boolean;
  setEditando: (editando: boolean) => void;
  status: StatusSalvamento;
  /** O campo está travado para quem está vendo? O mestre nunca está travado. */
  travado: (trava: keyof Travas) => boolean;
  /** Salva já e devolve se o banco aceitou. */
  salvar: (patch: Partial<Personagem>) => Promise<boolean>;
  /** Salva depois de uma pausa: para cliques seguidos em − e +. */
  salvarDepois: (patch: Partial<Personagem>, ms?: number) => void;
  setStatus: (status: StatusSalvamento) => void;
  /** Busca a ficha de novo no banco (ex.: depois de uma RPC gastar PE). */
  sincronizar: () => Promise<void>;
};

const FichaContexto = createContext<Contexto | null>(null);

export function useFicha() {
  const ctx = use(FichaContexto);
  if (!ctx) throw new Error("useFicha fora de <FichaProvider>");
  return ctx;
}

// Guarda a ficha na tela e no banco: atualiza na hora (otimista) e volta atrás se o banco recusar.
export function FichaProvider({
  inicial,
  souMestre,
  children,
}: {
  inicial: Personagem;
  souMestre: boolean;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [personagem, setPersonagem] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [status, setStatus] = useState<StatusSalvamento>("ocioso");
  const confirmado = useRef(inicial);
  const pendente = useRef<Partial<Personagem>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const enviar = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pendente.current;
    pendente.current = {};
    if (!Object.keys(patch).length) return true;

    setStatus("salvando");
    const { data, error } = await supabase
      .from("personagens")
      .update(patch)
      .eq("id", inicial.id)
      .select()
      .single();

    if (error || !data) {
      // PGRST116: o RLS escondeu a linha, então nada foi atualizado
      toast.error(error?.code === "PGRST116" ? "Sem permissão para alterar esta ficha" : (error?.message ?? "Não foi possível salvar"));
      setPersonagem({ ...confirmado.current, ...pendente.current });
      setStatus("erro");
      return false;
    }
    // o banco pode ajustar valores (ex.: vida limitada à vida máxima)
    confirmado.current = data as Personagem;
    setPersonagem({ ...confirmado.current, ...pendente.current });
    setStatus("salvo");
    return true;
  }, [supabase, inicial.id]);

  const salvarDepois = useCallback(
    (patch: Partial<Personagem>, ms = 500) => {
      setPersonagem((atual) => ({ ...atual, ...patch }));
      pendente.current = { ...pendente.current, ...patch };
      clearTimeout(timer.current);
      timer.current = setTimeout(enviar, ms);
    },
    [enviar],
  );

  const salvar = useCallback(
    (patch: Partial<Personagem>) => {
      setPersonagem((atual) => ({ ...atual, ...patch }));
      pendente.current = { ...pendente.current, ...patch };
      return enviar();
    },
    [enviar],
  );

  // não perde o último clique ao sair da página
  useEffect(() => {
    const aoSair = () => void enviar();
    window.addEventListener("pagehide", aoSair);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      void enviar();
    };
  }, [enviar]);

  // mudança que veio do banco (mestre, Realtime ou RPC): vira o novo valor confirmado
  const aplicarDoServidor = useCallback((linha: Personagem) => {
    confirmado.current = linha;
    setPersonagem({ ...linha, ...pendente.current });
  }, []);

  const sincronizar = useCallback(async () => {
    const { data } = await supabase.from("personagens").select("*").eq("id", inicial.id).single();
    if (data) aplicarDoServidor(data as Personagem);
  }, [supabase, inicial.id, aplicarDoServidor]);

  // ao vivo: o mestre mexe na ficha e o player vê na hora
  useEffect(() => {
    const canal = supabase
      .channel(`ficha-${inicial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "personagens", filter: `id=eq.${inicial.id}` },
        (payload) => aplicarDoServidor(payload.new as Personagem),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, inicial.id, aplicarDoServidor]);

  const travado = useCallback(
    (trava: keyof Travas) => !souMestre && personagem.travas?.[trava] !== false,
    [souMestre, personagem.travas],
  );

  return (
    <FichaContexto
      value={{
        personagem,
        souMestre,
        editando,
        setEditando,
        status,
        travado,
        salvar,
        salvarDepois,
        setStatus,
        sincronizar,
      }}
    >
      {children}
    </FichaContexto>
  );
}
