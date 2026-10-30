"use client";

import { cn } from "cn";
import { useFicha } from "@/components/ficha/contexto";

// As 16 áreas da ficha do Canva; o personagem marca as dominantes.
export const AREAS_CONHECIMENTO = [
  "Mundaneum", "Tecnologias", "Culturas", "Religiões",
  "Corrupção", "Mecanismos", "Medicinas", "Psicologia",
  "Pureza", "Natureza", "Combates", "Ciências",
  "Cósmico", "Sobrevivência", "Armas", "História",
];

export function Conhecimento() {
  const { personagem, editando, salvar } = useFicha();
  const dominantes = personagem.conhecimentos ?? [];
  // anotações antigas fora da lista continuam aparecendo
  const areas = [...AREAS_CONHECIMENTO, ...dominantes.filter((c) => !AREAS_CONHECIMENTO.includes(c))];

  function alternar(area: string) {
    void salvar({
      conhecimentos: dominantes.includes(area) ? dominantes.filter((c) => c !== area) : [...dominantes, area],
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl bg-card px-4 py-6">
      <h2 className="text-2xl tracking-[0.2em] text-mental uppercase">Conhecimento</h2>
      <p className="text-lg">
        {editando ? "Toque para marcar os conhecimentos dominantes:" : "Seus conhecimentos dominantes:"}
      </p>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {areas.map((area) => {
          const dominante = dominantes.includes(area);
          const texto = (
            <>
              {dominante && <span aria-hidden>➢ </span>}
              {area}
            </>
          );
          return (
            <li key={area} className="text-center">
              {editando ? (
                <button
                  type="button"
                  aria-pressed={dominante}
                  onClick={() => alternar(area)}
                  className={cn(
                    "min-h-11 w-full rounded-md px-2 text-lg italic transition-colors hover:bg-secondary",
                    dominante ? "text-caminho" : "text-foreground/80",
                  )}
                >
                  {texto}
                </button>
              ) : (
                <span
                  className={cn(
                    "inline-flex min-h-9 items-center text-lg italic",
                    dominante ? "text-caminho" : "text-foreground/45",
                  )}
                >
                  {texto}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
