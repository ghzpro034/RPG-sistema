"use client";

import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Contador, Travado } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { AcoesPE, UltimasRolagens, useRolador } from "@/components/ficha/rolador";
import { Input } from "@/components/ui/input";
import type { Atributo, Grupo } from "@/lib/ficha-tipos";
import { createClient, nomeCanal } from "@/lib/supabase/client";

// As três características (Compêndio): o D100 rola nelas; as especializações de cada uma rolam no D20.
const GRUPOS: { grupo: Grupo; titulo: string; texto: string; circulo: string; borda: string }[] = [
  { grupo: "vigor", titulo: "Vigor", texto: "text-forca", circulo: "bg-forca", borda: "border-forca" },
  { grupo: "mental", titulo: "Mental", texto: "text-mental", circulo: "bg-mental", borda: "border-mental" },
  { grupo: "social", titulo: "Social", texto: "text-social", circulo: "bg-social", borda: "border-social" },
];

const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

// O PE no losango dourado, ao lado da rolagem, como na ficha do Canva.
function LosangoPE() {
  const { personagem: p, editando, travado, salvarDepois } = useFicha();
  const peTravado = travado("pe");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {/* o quadrado girado ocupa a diagonal (~1,41×); a moldura reserva esse espaço */}
        <div className="flex size-24 items-center justify-center">
          <div className="flex size-16 rotate-45 items-center justify-center bg-ouro shadow-[0_0_20px] shadow-ouro/30">
            <span className="-rotate-45 font-heading text-2xl font-bold text-primary-foreground tabular-nums">
              {p.pe}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 leading-tight">
          <span className="font-heading text-xl">
            PE <span className="text-base text-muted-foreground">/ {p.pe_max}</span>
          </span>
          <AcoesPE />
        </div>
      </div>
      {editando &&
        (peTravado ? (
          <Travado />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <Contador rotulo="PE" valor={p.pe} max={p.pe_max} aoMudar={(pe) => salvarDepois({ pe })} />
            máx.
            <Contador rotulo="PE máximo" valor={p.pe_max} min={1} aoMudar={(pe_max) => salvarDepois({ pe_max })} />
          </div>
        ))}
    </div>
  );
}

function CampoNumero({
  valor,
  rotulo,
  aoSalvar,
  className,
}: {
  valor: number;
  rotulo: string;
  aoSalvar: (texto: string) => void;
  className?: string;
}) {
  return (
    <Input
      key={valor}
      type="number"
      inputMode="numeric"
      defaultValue={valor}
      aria-label={rotulo}
      onBlur={(e) => aoSalvar(e.currentTarget.value)}
      className={cn("h-9 w-16 text-center font-heading text-lg md:text-lg", className)}
    />
  );
}

export function Atributos({ inicial }: { inicial: Atributo[] }) {
  const { personagem, editando, travado, setStatus, morto, salvar } = useFicha();
  const { rolarD100, rolarD20, rolando, reforcar } = useRolador();
  const supabase = useMemo(() => createClient(), []);
  const [atributos, setAtributos] = useState(inicial);
  const confirmados = useRef(inicial);
  const podeEditar = editando && !travado("atributos");
  const semRolar = rolando || editando || morto;

  // ao vivo: o mestre ajusta uma especialização e ela muda aqui
  useEffect(() => {
    const canal = supabase
      .channel(nomeCanal(`atributos-${personagem.id}`))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atributos", filter: `personagem_id=eq.${personagem.id}` },
        (payload) => {
          const novo = payload.new as Atributo;
          const trocar = (lista: Atributo[]) =>
            lista.map((a) => (a.id === novo.id ? { ...a, valor: novo.valor, bonus: novo.bonus } : a));
          confirmados.current = trocar(confirmados.current);
          setAtributos(trocar);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, personagem.id]);

  async function salvarEspecializacao(id: string, campo: "valor" | "bonus", texto: string) {
    const numero = Number(texto);
    const atual = atributos.find((a) => a.id === id);
    if (!atual || texto.trim() === "" || Number.isNaN(numero)) return;
    const novo = campo === "valor" ? limitar(numero, 0, 100) : limitar(numero, -20, 20);
    if (novo === atual[campo]) return;

    setAtributos((lista) => lista.map((a) => (a.id === id ? { ...a, [campo]: novo } : a)));
    setStatus("salvando");
    const { error } = await supabase.from("atributos").update({ [campo]: novo }).eq("id", id);
    if (error) {
      toast.error(error.message);
      setAtributos(confirmados.current);
      setStatus("erro");
      return;
    }
    confirmados.current = confirmados.current.map((a) => (a.id === id ? { ...a, [campo]: novo } : a));
    setStatus("salvo");
  }

  function salvarCaracteristica(grupo: Grupo, texto: string) {
    const numero = Number(texto);
    if (texto.trim() === "" || Number.isNaN(numero)) return;
    const novo = limitar(numero, 0, 100);
    if (novo !== personagem[grupo]) void salvar({ [grupo]: novo });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl tracking-wide">Jogue um D100</h2>
          <p className="text-lg leading-snug text-muted-foreground">
            Ação geral: tire menos que a característica. Especialização: jogue um D20.
          </p>
          {!editando && !morto && reforcar && (
            <p className="text-base text-ouro">Reforço armado: a próxima rolagem usa 2 dados.</p>
          )}
          {editando && travado("atributos") && <Travado className="mt-1" />}
        </div>
        <LosangoPE />
      </div>

      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-3">
        {GRUPOS.map(({ grupo, titulo, texto, circulo, borda }) => (
          <div key={grupo} className="flex flex-col gap-2">
            {/* a característica: o número grande, rola o D100 */}
            {podeEditar ? (
              <div className="flex min-h-12 items-center gap-3">
                <CampoNumero
                  valor={personagem[grupo]}
                  rotulo={`${titulo} (%)`}
                  aoSalvar={(t) => salvarCaracteristica(grupo, t)}
                  className="h-11 w-18 text-xl md:text-xl"
                />
                <span className={cn("font-rotulo text-lg tracking-[0.2em] uppercase", texto)}>{titulo}</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={semRolar}
                onClick={() => rolarD100(grupo)}
                aria-label={`Rolar D100 em ${titulo} (${personagem[grupo]})`}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/10 bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary active:bg-accent disabled:hover:bg-secondary/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-full font-heading text-xl font-bold text-white tabular-nums",
                    circulo,
                  )}
                >
                  {personagem[grupo]}
                </span>
                <span className={cn("font-rotulo text-lg tracking-[0.2em] uppercase", texto)}>{titulo}</span>
                <span className="ml-auto font-heading text-xs text-muted-foreground">D100</span>
              </button>
            )}

            {/* as especializações: rolam o D20 e somam o bônus */}
            {/* editando: uma por linha, com o valor, o nome e o bônus alinhados */}
            <ul className={cn("grid gap-x-2 gap-y-1", podeEditar ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-1")}>
              {atributos
                .filter((a) => a.grupo === grupo)
                .map((a) => (
                  <li key={a.id}>
                    {podeEditar ? (
                      <div className="flex min-h-10 items-center gap-2">
                        <CampoNumero valor={a.valor} rotulo={a.nome} aoSalvar={(t) => salvarEspecializacao(a.id, "valor", t)} />
                        <span className="min-w-0 flex-1 truncate font-rotulo text-base tracking-wide uppercase">{a.nome}</span>
                        <label className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                          bônus
                          <CampoNumero
                            valor={a.bonus}
                            rotulo={`Bônus de D20 em ${a.nome}`}
                            aoSalvar={(t) => salvarEspecializacao(a.id, "bonus", t)}
                            className="h-8 w-14 text-base md:text-base"
                          />
                        </label>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={semRolar}
                        onClick={() => rolarD20(a.id)}
                        aria-label={`Rolar D20 em ${a.nome} (${a.valor}${a.bonus ? `, bônus ${a.bonus}` : ""})`}
                        className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-secondary active:bg-accent disabled:hover:bg-transparent sm:-mx-2 sm:gap-3 sm:px-2"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-heading text-sm font-bold tabular-nums sm:size-9",
                            borda,
                          )}
                        >
                          {a.valor}
                        </span>
                        <span className="truncate font-rotulo text-[0.8rem] uppercase sm:text-base sm:tracking-wide">
                          {a.nome}
                        </span>
                        {a.bonus !== 0 && (
                          <span className="shrink-0 font-heading text-xs text-ouro tabular-nums">
                            {a.bonus > 0 ? `+${a.bonus}` : `−${Math.abs(a.bonus)}`}
                          </span>
                        )}
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <UltimasRolagens />
    </section>
  );
}
