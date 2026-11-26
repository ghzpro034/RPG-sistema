import { Cantoneiras } from "@/components/Cantoneiras";
import { Sigilo } from "@/components/Sigilo";

// Cartão central das telas de entrada: o sigilo, o nome do RPG e uma moldura de carta com os cantos de gravura.
export function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-2">
          <Sigilo className="size-12 text-ouro drop-shadow-[0_0_14px_var(--ouro)]" title="Sigilo de A Silent Machine" />
          <p className="font-rotulo text-sm tracking-[0.35em] text-ouro uppercase">A Silent Machine</p>
        </div>
        <section className="moldura-carta relative rounded-lg bg-card/80 p-7 text-foreground/70 shadow-lg sm:p-8">
          <Cantoneiras />
          <h1 className="mb-6 text-center text-3xl text-foreground">{titulo}</h1>
          <div className="text-foreground">{children}</div>
        </section>
      </div>
    </main>
  );
}
