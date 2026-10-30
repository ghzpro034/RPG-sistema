import { redirect } from "next/navigation";
import { Suspense } from "react";
import { criarCampanha, criarPersonagem, entrarCampanha } from "@/app/actions";
import { Campo } from "@/components/Campo";
import { Formulario } from "@/components/Formulario";
import { Moldura } from "@/components/Moldura";
import { destinoDe, obterSessao } from "@/lib/sessao";

async function Conteudo() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar");

  // já está na mesa e com ficha (ou é o mestre): nada a fazer aqui
  const destino = destinoDe(sessao);
  if (destino !== "/comecar") redirect(destino);

  if (sessao.campanha) {
    return (
      <Moldura titulo="Seu personagem">
        <p className="mb-4 text-center text-lg text-muted-foreground">
          Você entrou em <span className="text-foreground">{sessao.campanha.nome}</span>. Como se chama
          seu personagem?
        </p>
        <Formulario acao={criarPersonagem} botao="Criar ficha">
          <input type="hidden" name="campanha_id" value={sessao.campanha.id} />
          <Campo rotulo="Nome do personagem" name="nome" required />
        </Formulario>
      </Moldura>
    );
  }

  return (
    <Moldura titulo={`Olá, ${sessao.nome}`}>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="mb-3 text-lg text-ouro">Vou jogar</h2>
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
        </div>
        <div className="border-t border-border pt-6">
          <h2 className="mb-3 text-lg text-ouro">Vou mestrar</h2>
          <Formulario acao={criarCampanha} botao="Criar mesa">
            <Campo rotulo="Nome da mesa" name="nome" required />
          </Formulario>
        </div>
      </div>
    </Moldura>
  );
}

export default function ComecarPage() {
  return (
    <Suspense fallback={<p className="m-auto text-xl text-muted-foreground">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}
