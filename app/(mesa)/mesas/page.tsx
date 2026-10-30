import { Check, Crown, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { criarCampanha, entrarCampanha, trocarMesa } from "@/app/actions";
import { Campo } from "@/components/Campo";
import { Formulario } from "@/components/Formulario";
import { obterSessao } from "@/lib/sessao";

// Todas as mesas do usuário: trocar de mesa, criar outra (mestre) ou entrar com um código.
async function Mesas() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar");

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl tracking-wide">Suas mesas</h2>
        {sessao.mesas.length ? (
          <ul className="flex flex-col gap-2">
            {sessao.mesas.map((m) => {
              const aberta = m.id === sessao.campanha?.id;
              return (
                <li key={m.id}>
                  <form action={trocarMesa}>
                    <input type="hidden" name="mesa" value={m.id} />
                    <button
                      type="submit"
                      aria-current={aberta ? "true" : undefined}
                      className={
                        "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left transition-colors hover:bg-secondary " +
                        (aberta ? "border-ouro/60 bg-ouro/5" : "border-border bg-card")
                      }
                    >
                      {m.papel === "mestre" ? (
                        <Crown className="size-5 shrink-0 text-ouro" aria-label="Mestre" />
                      ) : (
                        <Users className="size-5 shrink-0 text-muted-foreground" aria-label="Player" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-lg font-bold uppercase">{m.nome}</span>
                        <span className="text-base text-muted-foreground">
                          {m.papel === "mestre" ? `Você mestra · código ${m.codigo_convite}` : "Você joga"}
                        </span>
                      </span>
                      {aberta && (
                        <span className="flex items-center gap-1 text-base text-ouro">
                          <Check className="size-4" /> aberta
                        </span>
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-lg text-muted-foreground">Você ainda não está em nenhuma mesa.</p>
        )}
      </section>

      <aside className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-xl tracking-wide text-ouro">Nova mesa</h2>
          <p className="text-base text-muted-foreground">
            Para uma campanha solo ou um grupo novo. Você será o mestre dela.
          </p>
          <Formulario acao={criarCampanha} botao="Criar mesa">
            <Campo rotulo="Nome da mesa" name="nome" required />
          </Formulario>
        </section>
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-xl tracking-wide">Entrar com código</h2>
          <Formulario acao={entrarCampanha} botao="Entrar na mesa">
            <Campo
              rotulo="Código de convite"
              name="codigo"
              placeholder="K7Q2ZX"
              autoCapitalize="characters"
              maxLength={6}
              className="h-10 font-heading text-lg tracking-[0.3em] uppercase md:text-lg"
              required
            />
          </Formulario>
        </section>
      </aside>
    </div>
  );
}

export default function MesasPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-wide uppercase">Mesas</h1>
      <Suspense fallback={<p className="text-xl text-muted-foreground">Carregando as mesas…</p>}>
        <Mesas />
      </Suspense>
    </div>
  );
}
