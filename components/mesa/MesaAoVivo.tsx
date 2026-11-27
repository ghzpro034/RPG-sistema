"use client";

import { Crosshair, Dices, Flame, LogOut, Minus, Plus, RotateCcw, Shield, Skull, Sparkles, Sword, TrendingDown, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Memorial } from "@/components/mesa/Memorial";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCombate } from "@/components/combate";
import { Resultado, detalheDe, rotuloDe } from "@/components/ficha/rolador";
import { AplicarDano } from "@/components/mesa/AplicarDano";
import { PainelCombate } from "@/components/mesa/PainelCombate";
import { Button, buttonVariants } from "@/components/ui/button";
import { corDoEstado, estadoDe, fundoDoEstado } from "@/lib/estado";
import { apagarImagensSemUso } from "@/lib/imagem";
import type { GrupoCombate } from "@/lib/combate";
import type { Personagem, Rolagem, UsoCarta } from "@/lib/ficha-tipos";
import { EntregarItem } from "@/components/mesa/EntregarItem";
import { HistoricoAlteracoes } from "@/components/mesa/HistoricoAlteracoes";
import { TrazerPersonagem } from "@/components/mesa/TrazerPersonagem";
import type { Alteracao, CardPersonagem, DadosMesa } from "@/lib/mesa";
import { createClient, nomeCanal } from "@/lib/supabase/client";
import { Vazio } from "@/components/Estados";

function mesclarRolagem(lista: Rolagem[], rolagem: Rolagem) {
  return [rolagem, ...lista.filter((r) => r.id !== rolagem.id)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
}

// os três botões de grupo do card: A, B ou fora do combate
function EscolherGrupo({ nome, grupo, aoEscolher }: { nome: string; grupo: GrupoCombate | null; aoEscolher: (g: GrupoCombate | null) => void }) {
  const opcoes: { valor: GrupoCombate | null; rotulo: string }[] = [
    { valor: "a", rotulo: "A" },
    { valor: "b", rotulo: "B" },
    { valor: null, rotulo: "—" },
  ];
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Grupo de ${nome}`}>
      <span className="mr-1 font-rotulo text-xs tracking-[0.2em] text-muted-foreground uppercase">Grupo</span>
      {opcoes.map(({ valor, rotulo }) => (
        <button
          key={rotulo}
          type="button"
          aria-pressed={grupo === valor}
          aria-label={valor ? `Grupo ${rotulo}` : "Fora dos grupos"}
          onClick={() => grupo !== valor && aoEscolher(valor)}
          className={cn(
            "size-10 rounded-md border font-sans text-lg font-bold transition-colors pointer-coarse:size-11",
            grupo === valor ? "border-ouro bg-ouro text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}

function Card({
  p,
  grupo,
  minhaVez,
  aoMudarVida,
  aoMudarGrupo,
  aoTirar,
  aoMorrer,
  aoAplicarDano,
}: {
  p: CardPersonagem;
  grupo: GrupoCombate | null;
  minhaVez: boolean;
  aoMudarVida: (vida: number) => void;
  aoMudarGrupo: (grupo: GrupoCombate | null) => void;
  aoTirar: () => void;
  aoMorrer: () => void;
  /** a vida que o Dano deixou no banco */
  aoAplicarDano: (vida: number) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const estado = estadoDe(p.vida, p.vida_max, p.limiar_instavel);
  const porcentagem = Math.max(0, Math.min(100, (p.vida / p.vida_max) * 100));

  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", minhaVez ? "border-ouro shadow-[0_0_18px] shadow-ouro/25" : "border-border")}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-13 shrink-0 overflow-hidden rounded-[50%] border border-white/15 bg-secondary">
          {p.retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
            <img src={p.retratoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-rotulo text-2xl text-white/25">
              {p.nome.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold">{p.nome}</h3>
          <p className="truncate text-base text-muted-foreground">{p.jogador}</p>
        </div>
        <span className={cn("font-heading text-base", corDoEstado[estado])}>{estado}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="size-10 pointer-coarse:size-11" aria-label={`Diminuir vida de ${p.nome}`} disabled={p.vida <= 0} onClick={() => aoMudarVida(p.vida - 1)}>
          <Minus />
        </Button>
        <span className="min-w-20 rounded-full bg-sangue px-3 py-0.5 text-center font-heading text-xl tabular-nums">
          {p.vida}/{p.vida_max}
        </span>
        <Button variant="outline" className="size-10 pointer-coarse:size-11" aria-label={`Aumentar vida de ${p.nome}`} disabled={p.vida >= p.vida_max} onClick={() => aoMudarVida(p.vida + 1)}>
          <Plus />
        </Button>
        <div className="ml-1 h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full transition-all", fundoDoEstado[estado])} style={{ width: `${porcentagem}%` }} />
        </div>
      </div>

      <dl className="grid grid-cols-5 gap-1.5 text-center">
        {[
          { rotulo: "PE", valor: `${p.pe}/${p.pe_max}`, cor: "text-ouro" },
          { rotulo: "Sinerg.", valor: p.sinergia, cor: "text-mental" },
          { rotulo: "Corrup.", valor: p.corrupcao, cor: "text-corrupcao" },
          { rotulo: "Prot.", valor: p.defesa, cor: "" },
          { rotulo: "Congel.", valor: p.congelado, cor: p.congelado > p.limite_congelado ? "text-congelado" : "" },
        ].map(({ rotulo, valor, cor }) => (
          <div key={rotulo} className="rounded-md bg-secondary/60 py-1">
            <dt className="font-rotulo text-[0.65rem] tracking-widest text-muted-foreground uppercase">{rotulo}</dt>
            <dd className={cn("font-heading text-lg tabular-nums", cor)}>{valor}</dd>
          </div>
        ))}
      </dl>

      {/* combate: o grupo e o dano com a conta do Compêndio */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EscolherGrupo nome={p.nome} grupo={grupo} aoEscolher={aoMudarGrupo} />
        <AplicarDano personagemId={p.id} nome={p.nome} protecao={p.defesa} aoAplicar={aoAplicarDano} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
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
            autoFocus
            onClick={() => {
              setConfirmando(false);
              aoTirar();
            }}
            onBlur={() => setConfirmando(false)}
          >
            Tirar mesmo
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-10" onClick={() => setConfirmando(true)}>
            <LogOut /> Tirar da mesa
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-10 text-instavel" onClick={aoMorrer}>
          <Skull /> Morreu
        </Button>
      </div>
    </li>
  );
}

function mesclarUso(lista: UsoCarta[], uso: UsoCarta) {
  return [uso, ...lista.filter((u) => u.id !== uso.id)].slice(0, 20);
}

const ROTULO_USO: Record<UsoCarta["tipo"], string> = {
  arquetipo: "usou o arquétipo",
  trauma: "ativou o trauma",
  habilidade: "usou a habilidade",
  caminho: "usou o Caminho",
  acao: "fez",
};

// o servidor roda em UTC: o fuso fixo deixa a primeira carga igual ao que chega ao vivo
const hora = (quando: string) =>
  new Date(quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

// uma carta paga pelo jogador (trauma, Caminho…), no meio das rolagens
function LinhaUso({ uso, nome }: { uso: UsoCarta; nome: string }) {
  // custo negativo é ganho (Recuperar Foco: +2 PE)
  const pe = uso.custo_pe > 0 ? `−${uso.custo_pe} PE` : uso.custo_pe < 0 ? `+${-uso.custo_pe} PE` : null;
  const custo = [pe, uso.custo_sinergia && `−${uso.custo_sinergia} Sinergia`].filter(Boolean).join(" · ");
  const Icone = uso.tipo === "trauma" ? Flame : uso.tipo === "acao" ? Zap : Sparkles;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 motion-safe:animate-entrar",
        uso.tipo === "trauma" ? "border-sangue/60 bg-sangue/10" : uso.tipo === "acao" ? "border-ouro/40 bg-card" : "border-caminho/40 bg-card",
      )}
    >
      <Icone
        className={cn("size-6 w-10 shrink-0", uso.tipo === "trauma" ? "text-instavel" : uso.tipo === "acao" ? "text-ouro" : "text-caminho")}
        aria-hidden
      />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-base">
          <span className="font-bold">{nome}</span> <span className="text-muted-foreground">{ROTULO_USO[uso.tipo]}</span>{" "}
          <span className="uppercase">{uso.nome}</span>
        </p>
        <p className="text-sm text-muted-foreground">{custo}</p>
      </div>
      <time className="text-sm text-muted-foreground tabular-nums" suppressHydrationWarning>
        {hora(uso.created_at)}
      </time>
    </li>
  );
}

function FeedRolagens({ rolagens, usos, nomes }: { rolagens: Rolagem[]; usos: UsoCarta[]; nomes: Map<string, string> }) {
  // rolagens e cartas usadas, da mais nova para a mais antiga
  const eventos = [
    ...rolagens.map((r) => ({ tipo: "rolagem" as const, quando: r.created_at, r })),
    ...usos.map((u) => ({ tipo: "uso" as const, quando: u.created_at, u })),
  ]
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, 20);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg tracking-wide">
        <span className="size-2 animate-pulse rounded-full bg-instavel" aria-hidden /> Rolagens e cartas ao vivo
      </h2>
      {eventos.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {eventos.map((e) => {
            if (e.tipo === "uso") return <LinhaUso key={e.u.id} uso={e.u} nome={nomes.get(e.u.personagem_id) ?? "?"} />;
            const r = e.r;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 motion-safe:animate-entrar">
                <Resultado rolagem={r} className="w-10 text-center text-2xl" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-base leading-snug">
                    <span className="font-bold">{nomes.get(r.personagem_id) ?? "?"}</span>{" "}
                    {r.dado === "tiro" && <Crosshair className="mr-1 inline size-4 text-muted-foreground" aria-hidden />}
                    {r.dado === "dano" && <Sword className="mr-1 inline size-4 text-instavel" aria-hidden />}
                    <span className="uppercase">{r.atributo}</span>{" "}
                    <span className="text-muted-foreground">
                      {r.dado === "d20" ? "D20" : r.dado === "d100" ? `≤ ${r.alvo}` : rotuloDe(r)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.dado === "d20"
                      ? `${r.resultado}${r.bonus ? ` ${r.bonus > 0 ? "+" : "−"} ${Math.abs(r.bonus)}` : ""} · você julga`
                      : r.dado === "d100"
                        ? r.sucesso
                          ? "Sucesso"
                          : "Falha"
                        : detalheDe(r)}
                    {r.reforcado && r.dado !== "dano" && ` · reforçado (${r.dados?.join(" e ")})`}
                    {r.refeitos > 0 && ` · refeito ${r.refeitos}×`}
                  </p>
                </div>
                {r.refeitos > 0 && <RotateCcw className="size-4 text-muted-foreground" aria-hidden />}
                <time className="text-sm text-muted-foreground tabular-nums" suppressHydrationWarning>
                  {hora(r.created_at)}
                </time>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vazio compacto icone={Dices} titulo="Nenhuma rolagem ainda">
          As rolagens e as cartas usadas pelos jogadores aparecem aqui na hora.
        </Vazio>
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
  const [usos, setUsos] = useState(inicial.usos);
  const [alteracoes, setAlteracoes] = useState(inicial.alteracoes);
  const confirmados = useRef(inicial.personagens);
  // cliques de −/+ ainda não salvos: a diferença acumulada de cada ficha (o banco soma à vida que tem lá,
  // então um Dano aplicado no meio não é apagado)
  const pendentes = useRef(new Map<string, { delta: number; timer: ReturnType<typeof setTimeout> }>());
  const { estado: combate, erro: erroCombate, recarregar: recarregarCombate } = useCombate(campanhaId);

  // a vida que o banco confirmou, mais o que ainda falta salvar
  function vidaDoServidor(id: string, vida: number) {
    confirmados.current = confirmados.current.map((p) => (p.id === id ? { ...p, vida } : p));
    const falta = pendentes.current.get(id)?.delta ?? 0;
    setPersonagens((lista) =>
      lista.map((p) => (p.id === id ? { ...p, vida: Math.max(0, Math.min(p.vida_max, vida + falta)) } : p)),
    );
  }

  async function enviarVida(id: string) {
    const pendente = pendentes.current.get(id);
    if (!pendente) return;
    pendentes.current.delete(id);
    const { data, error } = await supabase.rpc("ajustar_vida", { p_personagem: id, p_delta: pendente.delta });
    if (error || data === null) {
      toast.error(error?.message ?? "Não deu para mudar a vida");
      const confirmada = confirmados.current.find((p) => p.id === id)?.vida;
      if (confirmada !== undefined) vidaDoServidor(id, confirmada);
      return;
    }
    vidaDoServidor(id, data as number);
  }

  // ao sair da Mesa (ou ela remontar), o que estava esperando é salvo na hora, não descartado
  useEffect(() => {
    const lista = pendentes.current;
    const salvarTudo = () => {
      for (const [id, { delta, timer }] of lista) {
        clearTimeout(timer);
        void supabase.rpc("ajustar_vida", { p_personagem: id, p_delta: delta });
      }
      lista.clear();
    };
    // a aba ficou oculta (trocou de app no celular, minimizou): salva já, enquanto o navegador ainda deixa enviar
    const aoOcultar = () => document.visibilityState === "hidden" && salvarTudo();
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", salvarTudo);
    return () => {
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", salvarTudo);
      salvarTudo();
    };
  }, [supabase]);

  // a Mesa é a página que o mestre mais abre: aproveita para limpar as imagens que sobraram
  useEffect(() => {
    apagarImagensSemUso(supabase).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    const esperando = pendentes.current;
    // a conexão caiu e voltou (ou a aba ficou muito tempo escondida): o que mudou nesse meio tempo não chegou,
    // então o servidor manda tudo de novo (a Mesa remonta com os dados novos)
    let caiu = false;
    let escondidaEm = 0;
    const recarregarTudo = () => router.refresh();
    const aoVoltarAba = () => {
      if (document.visibilityState === "hidden") escondidaEm = Date.now();
      else if (escondidaEm && Date.now() - escondidaEm > 30_000) recarregarTudo();
    };
    window.addEventListener("online", recarregarTudo);
    document.addEventListener("visibilitychange", aoVoltarAba);
    const canal = supabase
      .channel(nomeCanal(`mesa-${campanhaId}`))
      // alguém entrou ou saiu da mesa: o servidor recarrega a lista
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mesa_personagens", filter: `campanha_id=eq.${campanhaId}` },
        (payload) => payload.eventType !== "UPDATE" && router.refresh(),
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
          // a vida que chegou soma os cliques do mestre que ainda vão ser salvos
          const falta = esperando.get(novo.id)?.delta ?? 0;
          setPersonagens((lista) =>
            atualizar(lista).map((p) =>
              p.id === novo.id ? { ...p, vida: Math.max(0, Math.min(p.vida_max, novo.vida + falta)) } : p,
            ),
          );
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
        { event: "INSERT", schema: "public", table: "usos_carta", filter: `campanha_id=eq.${campanhaId}` },
        (payload) => setUsos((lista) => mesclarUso(lista, payload.new as UsoCarta)),
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && caiu) recarregarTudo();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") caiu = true;
      });
    return () => {
      window.removeEventListener("online", recarregarTudo);
      document.removeEventListener("visibilitychange", aoVoltarAba);
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

  async function mudarGrupo(p: CardPersonagem, grupo: GrupoCombate | null) {
    const { error } = await supabase.rpc("definir_grupo", { p_campanha: campanhaId, p_personagem: p.id, p_grupo: grupo });
    if (error) return toast.error(error.message);
    await recarregarCombate();
  }

  async function tirarDaMesa(p: CardPersonagem) {
    const { error } = await supabase.rpc("remover_da_mesa", { p_personagem: p.id, p_campanha: campanhaId });
    if (error) return toast.error(error.message);
    toast.success(`${p.nome} saiu desta mesa (a ficha continua nas outras)`);
    router.refresh();
  }

  // espera os cliques seguidos em − e + e manda a diferença de uma vez
  function mudarVida(id: string, vida: number) {
    const atual = personagens.find((p) => p.id === id);
    if (!atual) return;
    const anterior = pendentes.current.get(id);
    clearTimeout(anterior?.timer);
    pendentes.current.set(id, {
      delta: (anterior?.delta ?? 0) + (vida - atual.vida),
      timer: setTimeout(() => void enviarVida(id), 500),
    });
    setPersonagens((lista) => lista.map((p) => (p.id === id ? { ...p, vida } : p)));
  }

  // o histórico também cita quem já está no memorial
  const nomes = new Map([...inicial.memorial, ...personagens].map((p) => [p.id, p.nome]));
  const feridos = personagens.filter((p) => p.vida < p.vida_max);
  const pior = feridos.length ? feridos.reduce((a, b) => (b.vida / b.vida_max < a.vida / a.vida_max ? b : a)) : null;
  const corrompidos = personagens.filter((p) => p.corrupcao > 0);
  const corrompido = corrompidos.length ? corrompidos.reduce((a, b) => (b.corrupcao > a.corrupcao ? b : a)) : null;
  // de quem é a vez agora (o card dessa pessoa fica dourado)
  const vezDe = combate?.sequencia[combate.vez]?.personagem_id ?? null;

  return (
    // o feed ao vivo fica ao lado já no tablet; no PC largo a Mesa usa até 1600 px (data-largura, ver o layout)
    <div
      data-largura="ampla"
      className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 2xl:grid-cols-[minmax(0,1fr)_400px]"
    >
      <div className="flex flex-col gap-5">
        {/* com a mesa vazia em combate, o painel continua para dar para encerrar */}
        {(personagens.length > 0 || combate?.em_combate) && (
          <PainelCombate campanhaId={campanhaId} estado={combate} erro={erroCombate} aoMudar={recarregarCombate} />
        )}
        {(pior || corrompido) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {pior && (
            <p className="flex items-center gap-3 rounded-lg border border-instavel/40 bg-instavel/10 px-4 py-2 text-lg">
              <TrendingDown className="size-5 text-instavel" aria-hidden />
              <span>
                Pior: <b>{pior.nome}</b>{" "}
                <span className="text-muted-foreground">
                  ({pior.vida}/{pior.vida_max})
                </span>
              </span>
            </p>
            )}
            {corrompido && (
            <p className="flex items-center gap-3 rounded-lg border border-corrupcao/40 bg-corrupcao/10 px-4 py-2 text-lg">
              <Skull className="size-5 text-corrupcao" aria-hidden />
              <span>
                Mais corrupção: <b>{corrompido.nome}</b>{" "}
                <span className="text-muted-foreground">({corrompido.corrupcao})</span>
              </span>
            </p>
            )}
          </div>
        )}
        {personagens.length ? (
          <ul className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {personagens.map((p) => (
              <Card
                key={p.id}
                p={p}
                grupo={combate?.grupos[p.id] ?? null}
                minhaVez={Boolean(combate?.em_combate && vezDe === p.id)}
                aoMudarVida={(vida) => mudarVida(p.id, vida)}
                aoMudarGrupo={(grupo) => mudarGrupo(p, grupo)}
                aoTirar={() => tirarDaMesa(p)}
                aoMorrer={() => setMorrendo(p)}
                aoAplicarDano={(vida) => vidaDoServidor(p.id, vida)}
              />
            ))}
          </ul>
        ) : (
          <Vazio icone={Shield} titulo="Nenhuma ficha ainda">
            Passe o código de convite para os jogadores. As fichas aparecem aqui assim que eles entrarem.
          </Vazio>
        )}
        <Memorial falecidos={inicial.memorial} />
      </div>
      <aside className="flex flex-col gap-8">
        {/* o que mais se olha durante a sessão vem primeiro */}
        <FeedRolagens rolagens={rolagens} usos={usos} nomes={nomes} />
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
            <Button type="submit" variant="destructive" size="lg" disabled={registrando} className="font-heading">
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
  const { nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado, limiar_instavel, limite_congelado, sinergia } = p;
  return { nome, vida, vida_max, pe, pe_max, corrupcao, defesa, congelado, limiar_instavel, limite_congelado, sinergia };
}
