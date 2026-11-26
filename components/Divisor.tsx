import { cn } from "cn";

// O ornamento que separa as seções da ficha do Canva: uma linha, a cruz de quatro pontas, outra linha.
export function Divisor({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-foreground/50", className)} aria-hidden>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-current to-current" />
      <svg viewBox="0 0 24 24" className="size-4 fill-current">
        <path d="M12 1c.5 4.5 2.5 6.5 5 7.5l-5 1.5-5-1.5c2.5-1 4.5-3 5-7.5Zm0 22c-.5-4.5-2.5-6.5-5-7.5l5-1.5 5 1.5c-2.5 1-4.5 3-5 7.5ZM1 12c4.5-.5 6.5-2.5 7.5-5l1.5 5-1.5 5c-1-2.5-3-4.5-7.5-5Zm22 0c-4.5.5-6.5 2.5-7.5 5l-1.5-5 1.5-5c1 2.5 3 4.5 7.5 5Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-current to-current" />
    </div>
  );
}
