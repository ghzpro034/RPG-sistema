"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EstadoCombate } from "@/lib/combate";
import { createClient, nomeCanal } from "@/lib/supabase/client";

// O combate da mesa ao vivo: a Mesa e a ficha leem o mesmo estado (calculado no banco) e recarregam
// quando o mestre passa a vez, começa/encerra o combate ou muda alguém de grupo.
export function useCombate(campanhaId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<EstadoCombate | null>(null);

  const recarregar = useCallback(async () => {
    const { data } = await supabase.rpc("estado_do_combate", { p_campanha: campanhaId });
    setEstado((data as EstadoCombate | null) ?? null);
  }, [supabase, campanhaId]);

  useEffect(() => {
    let ativo = true;
    void supabase
      .rpc("estado_do_combate", { p_campanha: campanhaId })
      .then(({ data }) => ativo && setEstado((data as EstadoCombate | null) ?? null));
    const canal = supabase
      .channel(nomeCanal(`combate-${campanhaId}`))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "campanhas", filter: `id=eq.${campanhaId}` }, () =>
        void recarregar(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesa_personagens", filter: `campanha_id=eq.${campanhaId}` },
        () => void recarregar(),
      )
      .subscribe();
    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [supabase, campanhaId, recarregar]);

  return { estado, recarregar };
}
