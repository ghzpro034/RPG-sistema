"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EstadoCombate } from "@/lib/combate";
import { createClient, nomeCanal } from "@/lib/supabase/client";

// O combate da mesa ao vivo: a Mesa e a ficha leem o mesmo estado (calculado no banco) e recarregam
// quando o mestre passa a vez, começa/encerra o combate ou muda alguém de grupo.
// Uma falha de leitura não apaga o que já estava na tela (senão a Mesa pareceria "fora de combate").
export function useCombate(campanhaId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [estado, setEstado] = useState<EstadoCombate | null>(null);
  const [erro, setErro] = useState(false);
  // só a resposta do pedido mais novo vale (dois "Próximo" seguidos não voltam a tela para a vez anterior)
  const ultimoPedido = useRef(0);

  const recarregar = useCallback(async () => {
    const pedido = ++ultimoPedido.current;
    const { data, error } = await supabase.rpc("estado_do_combate", { p_campanha: campanhaId });
    if (pedido !== ultimoPedido.current) return;
    if (error) {
      setErro(true);
      return;
    }
    setErro(false);
    setEstado((data as EstadoCombate | null) ?? null);
  }, [supabase, campanhaId]);

  useEffect(() => {
    let caiu = false;
    // a primeira leitura (o estado só muda na resposta, e só se ela for a mais nova)
    const pedido = ++ultimoPedido.current;
    void supabase.rpc("estado_do_combate", { p_campanha: campanhaId }).then(({ data, error }) => {
      if (pedido !== ultimoPedido.current) return;
      setErro(Boolean(error));
      if (!error) setEstado((data as EstadoCombate | null) ?? null);
    });
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
      // a conexão caiu e voltou: o que mudou nesse meio tempo não chegou, então lê tudo de novo
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && caiu) {
          caiu = false;
          void recarregar();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") caiu = true;
      });
    const voltou = () => void recarregar();
    window.addEventListener("online", voltou);
    return () => {
      window.removeEventListener("online", voltou);
      void supabase.removeChannel(canal);
    };
  }, [supabase, campanhaId, recarregar]);

  return { estado, erro, recarregar };
}
