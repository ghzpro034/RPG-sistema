"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Disponivel } from "@/lib/mesa";
import { createClient } from "@/lib/supabase/client";

// Mestre traz para esta mesa um personagem que está em outra mesa dele (ex.: volta da campanha solo).
// A ficha é a mesma: continua valendo nas duas mesas.
export function TrazerPersonagem({ campanhaId, disponiveis }: { campanhaId: string; disponiveis: Disponivel[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [escolhido, setEscolhido] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function trazer() {
    if (!escolhido) return;
    setEnviando(true);
    const { error } = await supabase.rpc("importar_personagem", { p_personagem: escolhido, p_campanha: campanhaId });
    setEnviando(false);
    if (error) return toast.error(error.message);
    toast.success(`${disponiveis.find((d) => d.id === escolhido)?.nome} entrou na mesa`);
    setEscolhido("");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg tracking-wide">
        <UserPlus className="size-5 text-ouro" aria-hidden /> Trazer de outra mesa
      </h2>
      {disponiveis.length ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <select
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
            aria-label="Personagem de outra mesa"
            className="h-10 w-full rounded-lg border border-input bg-input/30 px-2.5 text-lg"
          >
            <option value="">Quem vem para esta mesa…</option>
            {disponiveis.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome} — de {d.mesas.join(", ")}
              </option>
            ))}
          </select>
          <Button size="lg" disabled={!escolhido || enviando} onClick={trazer} className="font-heading tracking-wider">
            {enviando ? "Trazendo…" : "Trazer para a mesa"}
          </Button>
          <p className="text-sm text-muted-foreground">A ficha é a mesma: continua valendo na mesa de onde veio.</p>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">
          Nenhum personagem de outras mesas suas para trazer. Crie outras mesas em “Mesas”.
        </p>
      )}
    </section>
  );
}
