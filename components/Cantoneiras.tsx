import { cn } from "cn";

// Os cantos de gravura da ficha física: uma volta de linha dupla em cada canto da moldura.
// Coloque dentro de um elemento com position relative; não captura toques.
function Canto({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("absolute size-7 fill-none stroke-current stroke-[1.5] sm:size-9", className)}
      aria-hidden
    >
      <path d="M2 38V10a8 8 0 0 1 8-8h28" />
      <path d="M8 38V14a6 6 0 0 1 6-6h24" opacity=".55" />
      <path d="M2 2c6 2 9 5 10 10" opacity=".8" />
      <circle cx="12" cy="12" r="1.6" className="fill-current" />
    </svg>
  );
}

export function Cantoneiras({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 text-ouro/70", className)} aria-hidden>
      <Canto className="top-1 left-1" />
      <Canto className="top-1 right-1 -scale-x-100" />
      <Canto className="bottom-1 left-1 -scale-y-100" />
      <Canto className="right-1 bottom-1 -scale-100" />
    </div>
  );
}
