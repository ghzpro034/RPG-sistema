import { cn } from "cn";

// O sigilo de A Silent Machine, redesenhado das cartas (o canto superior esquerdo das cartas de arquétipo
// e o topo das cartas de trauma): uma haste com um ponto acima, a barra cruzada, o braço que vira
// em diagonal e o ponto à direita. Usa currentColor: pinte com text-ouro, text-corrupcao etc.
export function Sigilo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={cn("inline-block size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth="11"
      strokeLinecap="butt"
      strokeLinejoin="miter"
    >
      <title>{title}</title>
      {/* ponto do alto */}
      <circle cx="38" cy="9" r="8" fill="currentColor" stroke="none" />
      {/* barra cruzada */}
      <path d="M14 42h48" />
      {/* a haste, o braço e a diagonal, num traço só (canto limpo) */}
      <path d="M38 22v40h40L40 114" />
      {/* ponto à direita, solto do braço */}
      <circle cx="95" cy="54" r="8" fill="currentColor" stroke="none" />
    </svg>
  );
}
