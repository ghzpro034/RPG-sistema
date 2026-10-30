"use client";

import { Skull } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Falecido } from "@/lib/mesa";
import { createClient } from "@/lib/supabase/client";

// Quem morreu nesta mesa. A ficha fica guardada (só leitura) e o mestre pode trazer de volta.
export function Memorial({ falecidos }: { falecidos: Falecido[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (!falecidos.length) return null;

  async function reviver(f: Falecido) {
    setConfirmando(null);
    const { error } = await supabase.rpc("reviver_personagem", { p_personagem: f.id });
    if (error) return toast.error(error.message);
    toast.success(`${f.nome} voltou do memorial`);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 text-xl tracking-wide">
        <Skull className="size-5 text-muted-foreground" aria-hidden /> Memorial
      </h2>
      <ul className="grid gap-3 xl:grid-cols-2">
        {falecidos.map((f) => (
          <li key={f.id} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4">
            <div className="h-16 w-13 shrink-0 overflow-hidden rounded-[50%] border border-white/10 bg-secondary grayscale">
              {f.retratoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                <img src={f.retratoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center font-heading text-2xl text-white/20">
                  {f.nome.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-lg font-bold tracking-wide text-muted-foreground uppercase line-through decoration-1">
                {f.nome}
              </p>
              <p className="text-base text-muted-foreground" suppressHydrationWarning>
                {f.jogador} · morreu em {new Date(f.morto_em).toLocaleDateString("pt-BR")}
              </p>
              {f.epitafio && <p className="text-base italic">“{f.epitafio}”</p>}
              <div className="mt-1 flex flex-wrap gap-2">
                <Link href={`/ficha/${f.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Ver ficha
                </Link>
                {confirmando === f.id ? (
                  <Button size="sm" onClick={() => reviver(f)} onBlur={() => setConfirmando(null)}>
                    Confirmar: trazer de volta
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmando(f.id)}>
                    Trazer de volta
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
