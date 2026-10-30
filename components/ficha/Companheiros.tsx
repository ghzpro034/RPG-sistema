import { assinar } from "@/lib/conteudo";
import { createClient } from "@/lib/supabase/server";

export type Colega = { id: string; nome: string; retrato_path: string | null; jogador: string; sou_eu: boolean };

// Faixa com o nome e a foto dos colegas de mesa (só o básico, sem a ficha deles).
export async function Companheiros({ campanhaId }: { campanhaId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("colegas_da_mesa", { p_campanha: campanhaId });
  const colegas = ((data ?? []) as Colega[]).filter((c) => !c.sou_eu);
  if (!colegas.length) return null;

  const urls = await assinar(supabase, colegas.map((c) => c.retrato_path));
  return (
    <ListaCompanheiros
      colegas={colegas.map((c) => ({ ...c, url: c.retrato_path ? (urls.get(c.retrato_path) ?? null) : null }))}
    />
  );
}

export function ListaCompanheiros({ colegas }: { colegas: (Colega & { url: string | null })[] }) {
  return (
    <section aria-labelledby="companheiros" className="flex flex-col gap-2">
      <h2 id="companheiros" className="font-heading text-xs tracking-[0.25em] text-muted-foreground uppercase">
        Companheiros de mesa
      </h2>
      <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {colegas.map((c) => (
          <li key={c.id} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
            <div className="h-20 w-16 overflow-hidden rounded-[50%] border border-white/15 bg-secondary">
              {c.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                <img src={c.url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center font-heading text-2xl text-white/25">
                  {c.nome.charAt(0)}
                </span>
              )}
            </div>
            <span className="w-full truncate font-heading text-xs font-bold tracking-wide uppercase">{c.nome}</span>
            <span className="-mt-1 w-full truncate text-sm text-muted-foreground">{c.jogador}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
