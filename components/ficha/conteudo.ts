"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { carregarCartas, carregarGracas, carregarInventario } from "@/lib/conteudo";
import type { Carta, Graca, ItemInventario } from "@/lib/ficha-tipos";
import { createClient, nomeCanal } from "@/lib/supabase/client";

type Conteudo = { cartas: Carta[]; inventario: ItemInventario[]; gracas: Graca[] };

// Cartas, inventário e graças da ficha, mantidos em dia pelo Realtime.
// O Realtime não filtra DELETE por personagem, então também recarrega quando a aba volta a ficar visível.
export function useConteudoAoVivo(personagemId: string, inicial: Conteudo) {
  const supabase = useMemo(() => createClient(), []);
  const [cartas, setCartas] = useState(inicial.cartas);
  const [inventario, setInventario] = useState(inicial.inventario);
  const [gracas, setGracas] = useState(inicial.gracas);

  const recarregarCartas = useCallback(
    async () => setCartas(await carregarCartas(supabase, personagemId)),
    [supabase, personagemId],
  );
  const recarregarInventario = useCallback(
    async () => setInventario(await carregarInventario(supabase, personagemId)),
    [supabase, personagemId],
  );
  const recarregarGracas = useCallback(
    async () => setGracas(await carregarGracas(supabase, personagemId)),
    [supabase, personagemId],
  );

  useEffect(() => {
    const filtro = `personagem_id=eq.${personagemId}`;
    const canal = supabase
      .channel(nomeCanal(`conteudo-${personagemId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "personagem_cartas", filter: filtro }, () => {
        void recarregarCartas();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventario", filter: filtro }, () => {
        void recarregarInventario();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gracas", filter: filtro }, () => {
        void recarregarGracas();
      })
      .subscribe();

    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      void recarregarCartas();
      void recarregarInventario();
      void recarregarGracas();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      void supabase.removeChannel(canal);
    };
  }, [supabase, personagemId, recarregarCartas, recarregarInventario, recarregarGracas]);

  return { cartas, inventario, gracas, recarregarCartas, recarregarInventario, recarregarGracas };
}
