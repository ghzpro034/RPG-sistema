"use client";

import { LogOut, Minus, Plus, RotateCcw, Shield, Skull, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Memorial } from "@/components/mesa/Memorial";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Resultado } from "@/components/ficha/rolador";
import { Button, buttonVariants } from "@/components/ui/button";
import { corDoEstado, estadoDe, fundoDoEstado } from "@/lib/estado";
import { LIMITE_CONGELADO, type Personagem, type Rolagem } from "@/lib/ficha-tipos";
import { EntregarItem } from "@/components/mesa/EntregarItem";
import { HistoricoAlteracoes } from "@/components/mesa/HistoricoAlteracoes";
import { TrazerPersonagem } from "@/components/mesa/TrazerPersonagem";
import type { Alteracao, CardPersonagem, DadosMesa } from "@/lib/mesa";
import { createClient } from "@/lib/supabase/client";

function mesclarRolagem(lista: Rolagem[], rolagem: Rolagem) {
  return [rolagem, ...lista.filter((r) => r.id !== rolagem.id)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
}

function Card({
  p,
  aoMudarVida,
  aoTirar,
  aoMorrer,
}: {
  p: CardPersonagem;
  aoMudarVida: (vida: number) => void;
  aoTirar: () => void;
  aoMorrer: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const estado = estadoDe(p.vida);
  const porcentagem = Math.max(0, Math.min(100, (p.vida / p.vida_max) * 100));

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-16 w-13 shrink-0 overflow-hidden rounded-[50%] border border-white/15 bg-secondary">
          {p.retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
            <img src={p.retratoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-heading text-2xl text-white/25">
              {p.nome.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold tracking-wide uppercase">{p.nome}</h3>
          <p className="truncate text-base text-muted-foreground">{p.jogador}</p>
        </div>
        <span className={cn("font-heading text-base", corDoEstado[estado])}>{estado}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="size-10" aria-label={`Diminuir vida de ${p.nome}`} disabled={p.vida <= 0} onClick={() => aoMudarVida(p.vida - 1)}>
          <Minus />
        </Button>
        <span className="min-w-20 rounded-full bg-sangue px-3 py-0.5 text-center font-heading text-xl tabular-nums">
          {p.vida}/{p.vida_max}
        </span>
        <Button variant="outline" className="size-10" aria-label={`Aumentar vida de ${p.nome}`} disabled={p.vida >= p.vida_max} onClick={() => aoMudarVida(p.vida + 1)}>
          <Plus />
        </Button>
        <div className="ml-1 h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full transition-all", fundoDoEstado[estado])} style={{ width: `${porcentagem}%` }} />
        </div>
      </div>

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          { rotulo: "PE", valor: `${p.pe}/${p.pe_max}`, cor: "text-ouro" },
          { rotulo: "Corrup.", valor: p.corrupcao, cor: "text-corrupcao" },
          { rotulo: "Defesa", valor: p.defesa, cor: "" },
          { rotulo: "Congel.", valor: p.congelado, cor: p.congelado > LIMITE_CONGELADO ? "text-congelado" : "" },
        ].map(({ rotulo, valor, cor }) => (
          <div key={rotulo} className="rounded-md bg-secondary/60 py-1">
            <dt className="font-heading text-[0.65rem] tracking-widest text-muted-foreground uppercase">{rotulo}</dt>
            <dd className={cn("font-heading text-lg tabular-nums", cor)}>{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-2">
        <span className="text-base text-muted-foreground">
          {p.itens} {p.itens === 1 ? "item" : "itens"}
        </span>
        <Link href={`/ficha/${p.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          Abrir e editar ficha
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border/60 pt-2">
        {/* tira só desta mesa; a ficha continua nas outras */}
        {confirmando ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setConfirmando(false);
              aoTirar();
            }}
            onBlur={() => setConfirmando(false)}
          >
            Tirar mesmo
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
            <LogOut /> Tirar da mesa
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-instavel" onClick={aoMorrer}>
          <Skull /> Morreu
        </Button>
      </div>
    </li>
  );
}

function FeedRolagens({ rolagens, nomes }: { rolagens: Rolagem[]; nomes: Map<string, string> }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg tracking-wide">
        <span className="size-2 animate-pulse rounded-full bg-instavel" aria-hidden /> Rolagens ao vivo
      </h2>
      {rolagens.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {rolagens.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <Resultado rolagem={r} className="w-10 text-center text-2xl" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-base">
                  <span className="font-bold">{nomes.get(r.personagem_id) ?? "?"}</span>{" "}
                  <span className="uppercase">{r.atributo}</span>{" "}
                  <span className="text-muted-foreground">≤ {r.alvo}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.sucesso ? "Sucesso" : "Falha"}
                  {r.reforcado && ` · reforçado (${r.dados?.join(" e ")})`}
                  {r.refeitos > 0 && ` · refeito ${r.refeitos}×`}
                </p>
              </div>
              {r.refeitos > 0 && <RotateCcw className="size-4 text-muted-foreground" aria-hidden />}
              <time className="text-sm text-muted-foreground tabular-nums" suppressHydrationWarning>
                {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">Nenhuma rolagem ainda nesta mesa.</p>
      )}
    </section>
  );
}

// Painel do mestre: fichas e rolagens chegam sozinhas pelo Realtime.
export function MesaAoVivo({ campanhaId, inicial }: { campanhaId: string; inicial: DadosMesa }) {
  // fichas podem vir de outras mesas, então o filtro é pelos ids das fichas desta mesa
  const ids = inicial.personagens.map((p) => p.id).join(",");
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [personagens, setPersonagens] = useState(inicial.personagens);
  const [rolagens, setRolagens] = useState(inicial.rolagens);
  const [alteracoes, setAlteracoes] = useState(inicial.alteracoes);
  const confirmados = useRef(inicial.personagens);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pendentes = timers.current;
    const canal = supabase
      .channel(`mesa-${campanhaId}`)
      // alguém entrou ou saiu da mesa: o servidor recarrega a lista
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesa_personagens", filter: `campanha_id=eq.${campanhaId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "personagens", filter: `id=in.(${ids || "00000000-0000-0000-0000-000000000000"})` },
        (payload) => {
          const novo = payload.new as Personagem;
          const antigo = confirmados.current.find((p) => p.id === novo?.id);
          // retrato trocado ou morte registrada: o servidor recarrega (foto nova, memorial)
          if (!antigo || antigo.retrato_path !== novo.retrato_path || novo.morto_em) {
            router.refresh();
            return;
          }
          const atualizar = (lista: CardPersonagem[]) =>
            lista.map((p) => (p.id === novo.id ? { ...p, ...pick(novo) } : p));
          confirmados.current = atualizar(confirmados.current);
          // não atropela um clique do mestre que ainda vai ser salvo
          if (!pendentes.has(novo.id)) setPersonagens(atualizar);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rolagens", filter: `campanha_id=eq.${campanhaId}` },
        (payload) => {
          if (payload.eventType !== "DELETE") setRolagens((lista) => mesclarRolagem(lista, payload.new as Rolagem));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alteracoes", filter: `personagem_id=in.(${ids || "00000000-0000-0000-0000-000000000000"})` },
        (payload) => {
          const nova = payload.new as Alteracao;
          setAlteracoes((lista) => [nova, ...lista].slice(0, 30));
          // item entregue ou removido: atualiza a contagem no card
          if (nova.tabela === "inventario" && (nova.de === null || nova.para === null)) {
            const delta = nova.de === null ? 1 : -1;
            const mudar = (lista: CardPersonagem[]) =>
              lista.map((p) => (p.id === nova.personagem_id ? { ...p, itens: Math.max(0, p.itens + delta) } : p));
            confirmados.current = mudar(confirmados.current);
            setPersonagens(mudar);
          }
        },
      )
      .subscribe();
    return () => {
      pendentes.forEach(clearTimeout);
      void supabase.removeChannel(canal);
    };
  }, [supabase, campanhaId, ids, router]);

  const [morrendo, setMorrendo] = useState<CardPersonagem | null>(null);
  const [registrando, setRegistrando] = useState(false);

  async function registrarMorte(epitafio: string) {
    if (!morrendo) return;
    setRegistrando(true);
    const { error } = await supabase.rpc("matar_personagem", { p_personagem: morrendo.id, p_epitafio: epitafio });
    setRegistrando(false);
    if (error) return toast.error(error.message);
    toast.success(`${morrendo.nome} foi para o memorial`);
    setMorrendo(null);
    router.refresh();
  }

  async function tirarDaMesa(p: CardPersonagem) {
    const { error } = await supabase.rpc("remover_da_mesa", { p_personagem: p.id, p_campanha: campanhaId });
    if (error) return toast.error(error.message);
    toast.success(`${p.nome} saiu desta mesa (a ficha continua nas outras)`);
    router.refresh();
  }

  function mudarVida(id: string, vida: number) {
    setPersonagens((lista) => lista.map((p) => (p.id === id ? { ...p, vida } : p)));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(async () => {
        timers.current.delete(id);
        const { error } = await supabase.from("personagens").update({ vida }).eq("id", id);
        if (error) {
          toast.error(error.message);
          setPersonagens(confirmados.current);
        }
      }, 500),
    );
  }

  // o histórico também cita quem já está no memorial
  const nomes = new Map([...inicial.memorial, ...personagens].map((p) => [p.id, p.nome]));
  const pior = personagens.length ? personagens.reduce((a, b) => (b.vida < a.vida ? b : a)) : null;
  const corrompido = personagens.length ? personagens.reduce((a, b) => (b.corrupcao > a.corrupcao ? b : a)) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5">
        {pior && corrompido && (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-3 rounded-lg border border-instavel/40 bg-instavel/10 px-4 py-2 text-lg">
              <TrendingDown className="size-5 text-instavel" aria-hidden />
              <span>
                Pior: <b>{pior.nome}</b>{" "}
                <span className="text-muted-foreground">
                  ({pior.vida}/{pior.vida_max})
                </span>
              </span>
            </p>
            <p className="flex items-center gap-3 rounded-lg border border-corrupcao/40 bg-corrupcao/10 px-4 py-2 text-lg">
              <Skull className="size-5 text-corrupcao" aria-hidden />
              <span>
                Mais corrupção: <b>{corrompido.nome}</b>{" "}
                <span className="text-muted-foreground">({corrompido.corrupcao})</span>
              </span>
            </p>
          </div>
        )}
        {personagens.length ? (
          <ul className="grid gap-4 xl:grid-cols-2">
            {personagens.map((p) => (
              <Card
                key={p.id}
                p={p}
                aoMudarVida={(vida) => mudarVida(p.id, vida)}
                aoTirar={() => tirarDaMesa(p)}
                aoMorrer={() => setMorrendo(p)}
              />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-lg text-muted-foreground">
            <Shield className="size-5" /> Nenhuma ficha ainda. Passe o código de convite para os jogadores.
          </p>
        )}
        <Memorial falecidos={inicial.memorial} />
      </div>
      <aside className="flex flex-col gap-8">
        {/* o que mais se olha durante a sessão vem primeiro */}
        <FeedRolagens rolagens={rolagens} nomes={nomes} />
        <EntregarItem personagens={personagens} itens={inicial.itens} />
        <HistoricoAlteracoes alteracoes={alteracoes} nomes={nomes} autores={inicial.autores} />
        <TrazerPersonagem campanhaId={campanhaId} disponiveis={inicial.disponiveis} />
      </aside>

      <Dialog open={morrendo !== null} onOpenChange={(aberto) => !aberto && setMorrendo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Skull className="size-5" /> {morrendo?.nome} morreu?
            </DialogTitle>
            <DialogDescription className="text-base">
              A ficha vai para o memorial (só leitura) e {morrendo?.jogador} sai das mesas onde o personagem estava.
              Para voltar, entra com um código e cria outro personagem. Você pode trazer a ficha de volta depois.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void registrarMorte(String(new FormData(e.currentTarget).get("epitafio") ?? ""));
            }}
          >
            <Textarea
              name="epitafio"
              placeholder="Epitáfio (opcional): como foi o fim?"
              className="min-h-20 text-lg md:text-lg"
            />
            <Button type="submit" variant="destructive" size="lg" disabled={registrando} className="font-heading tracking-wider">
              {registrando ? "Registrando…" : "Registrar a morte"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// só os campos que o card mostra (o resto da linha não interessa aqui)
function pick(p: Personagem) {
  const { nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado } = p;
  return { nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado };
}
