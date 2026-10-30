// Cartão central com o título do Grimório, usado nas telas de entrada.
export function Moldura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center font-heading text-sm tracking-[0.3em] text-ouro">GRIMÓRIO</p>
        <section className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <h1 className="mb-6 text-center text-2xl tracking-wide">{titulo}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
