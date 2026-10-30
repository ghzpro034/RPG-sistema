import { cn } from "cn";
import type { Carta, TipoCarta } from "@/lib/ficha-tipos";

const ESTILO: Record<TipoCarta, { rotulo: string; moldura: string; titulo: string; texto: string; marcador: string }> = {
  arquetipo: { rotulo: "Arquétipo", moldura: "border-white/70", titulo: "text-ouro", texto: "text-ouro/90", marcador: "marker:text-ouro" },
  trauma: { rotulo: "Trauma", moldura: "border-sangue", titulo: "text-instavel", texto: "text-instavel/90", marcador: "marker:text-instavel" },
  habilidade: { rotulo: "Habilidade", moldura: "border-social", titulo: "text-social", texto: "text-foreground", marcador: "marker:text-social" },
  revolta: { rotulo: "Revolta", moldura: "border-caminho", titulo: "text-caminho", texto: "text-foreground", marcador: "marker:text-caminho" },
};

// Cartas como na ficha do Canva: a carta à esquerda, o texto à direita.
export function Baralho({ cartas }: { cartas: Carta[] }) {
  if (!cartas.length) {
    return <p className="py-6 text-center text-lg text-muted-foreground">O mestre ainda não te deu nenhuma carta.</p>;
  }

  return (
    <ul className="grid gap-8 lg:grid-cols-2">
      {cartas.map((c) => {
        const estilo = ESTILO[c.tipo];
        return (
          <li key={c.id} className="flex gap-4">
            <div
              className={cn(
                "flex aspect-[5/7] w-28 shrink-0 items-end justify-center overflow-hidden rounded-md border-4 bg-secondary sm:w-32",
                estilo.moldura,
              )}
            >
              {c.imagemUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
                <img src={c.imagemUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="mb-2 px-1 text-center font-heading text-[0.65rem] tracking-wider uppercase">{c.nome}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="font-heading text-xs tracking-[0.2em] text-muted-foreground uppercase">{estilo.rotulo}</span>
              <h3 className={cn("text-xl font-bold tracking-wide uppercase", estilo.titulo)}>{c.nome}</h3>
              {c.citacao && <p className="text-lg italic">“{c.citacao}”</p>}
              {c.efeitos.length > 0 && (
                <ul className={cn("list-disc pl-5 text-lg leading-snug", estilo.texto, estilo.marcador)}>
                  {c.efeitos.map((efeito) => (
                    <li key={efeito}>{efeito}</li>
                  ))}
                </ul>
              )}
              {c.custo && (
                <p className="text-base text-muted-foreground">
                  Custo: <span className="font-heading text-ouro uppercase">{c.custo}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
