"use client";

import { ImageIcon, Layers, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Estrelas } from "@/components/ficha/Inventario";
import {
  BUCKET_IMAGENS,
  CAMINHOS,
  MAX_MEMORIAS,
  nomeDoCaminho,
  type Carta,
  type ItemCatalogo,
  type MemoriaItem,
  type Raridade,
  type TipoCarta,
} from "@/lib/ficha-tipos";
import { apagarImagensSemUso, enviarImagemCatalogo, mensagemDeEnvio } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";
import { Vazio } from "@/components/Estados";

const RARIDADES: { valor: Raridade; rotulo: string; cor: string }[] = [
  { valor: "comum", rotulo: "Comum", cor: "text-comum" },
  { valor: "incomum", rotulo: "Incomum", cor: "text-incomum" },
  { valor: "unico", rotulo: "Único", cor: "text-unico" },
];

const TIPOS: { valor: TipoCarta; rotulo: string; cor: string }[] = [
  { valor: "arquetipo", rotulo: "Arquétipo", cor: "text-ouro" },
  { valor: "trauma", rotulo: "Trauma", cor: "text-instavel" },
  { valor: "habilidade", rotulo: "Habilidade única", cor: "text-social" },
  { valor: "caminho", rotulo: "Caminho", cor: "text-caminho" },
];

const ORDEM_TIPOS = TIPOS.map((t) => t.valor);

// o custo que a carta cobra ao ser usada na ficha
function textoDoCusto(c: Carta) {
  const partes = [];
  if (c.custo_pe) partes.push(`${c.custo_pe} PE`);
  if (c.custo_sinergia) partes.push(`${c.custo_sinergia} Sinergia`);
  return partes.join(" + ") || c.custo;
}

const numeroDe = (valor: FormDataEntryValue | null) => Math.max(0, Math.min(50, Math.round(Number(valor) || 0)));

const SELECT = "h-10 w-full rounded-lg border border-input bg-input/30 px-2.5 text-lg";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-base">{rotulo}</Label>
      {children}
    </div>
  );
}

function Miniatura({ url, className }: { url: string | null; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-5 text-muted-foreground/40" aria-hidden />
      )}
    </div>
  );
}

// Campos do item. A raridade limita as memórias (Comum 1, Incomum 3, Único 5); cada memória tem nome, descrição e efeito.
function CamposItem({ item }: { item: ItemCatalogo | null }) {
  const [raridade, setRaridade] = useState<Raridade>(item?.raridade ?? "comum");
  const [total, setTotal] = useState(item?.max_memorias ?? 0);
  const limite = MAX_MEMORIAS[raridade];
  const memorias = Math.min(total, limite);
  return (
    <>
      <Campo rotulo="Nome">
        <Input name="nome" defaultValue={item?.nome} required className="h-10 text-lg md:text-lg" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Raridade">
          <select name="raridade" value={raridade} onChange={(e) => setRaridade(e.target.value as Raridade)} className={SELECT}>
            {RARIDADES.map((r) => (
              <option key={r.valor} value={r.valor}>{r.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo={`Memórias (até ${limite})`}>
          <Input
            name="max_memorias"
            type="number"
            min={0}
            max={limite}
            value={memorias}
            onChange={(e) => setTotal(Math.max(0, Math.min(limite, Number(e.target.value) || 0)))}
            className="h-10 text-lg md:text-lg"
          />
        </Campo>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <Campo rotulo="Dano (ex.: 2D10)">
          <Input name="dano" defaultValue={item?.dano ?? ""} className="h-10 text-lg md:text-lg" />
        </Campo>
        <Campo rotulo="Bônus (ex.: +3 de Cura)">
          <Input name="efeito" defaultValue={item?.efeito ?? ""} className="h-10 text-lg md:text-lg" />
        </Campo>
      </div>
      <Campo rotulo="Descrição">
        <Textarea name="descricao" defaultValue={item?.descricao ?? ""} className="min-h-20 text-lg md:text-lg" />
      </Campo>
      <Campo rotulo="Criado por (opcional)">
        <Input name="criador" defaultValue={item?.criador ?? ""} className="h-10 text-lg md:text-lg" />
      </Campo>
      {/* memória sem nome fica em branco na ficha ("Memória II"); o jogador só vê o texto depois que o mestre desbloqueia */}
      {Array.from({ length: memorias }, (_, n) => {
        const atual = item?.memorias.find((m) => m.ordem === n + 1);
        return (
          <fieldset key={n} className="flex flex-col gap-2 rounded-lg border border-incomum/40 p-3">
            <legend className="px-1 font-rotulo text-xs tracking-[0.2em] text-incomum uppercase">Memória {ROMANOS[n]}</legend>
            <Input name={`memoria_nome_${n + 1}`} defaultValue={atual?.nome ?? ""} placeholder="Nome (ex.: Corte Seco)" className="h-10 text-lg md:text-lg" />
            <Textarea name={`memoria_descricao_${n + 1}`} defaultValue={atual?.descricao ?? ""} placeholder="A história da memória" className="min-h-16 text-lg md:text-lg" />
            <Input name={`memoria_efeito_${n + 1}`} defaultValue={atual?.efeito ?? ""} placeholder="Efeito (ex.: +10 de dano em membros)" className="h-10 text-lg md:text-lg" />
          </fieldset>
        );
      })}
    </>
  );
}

const ROMANOS = ["I", "II", "III", "IV", "V"];

// Campos da carta; Caminho e nível só aparecem nas cartas de caminho.
function CamposCarta({ carta }: { carta: Carta | null }) {
  const [tipo, setTipo] = useState<TipoCarta>(carta?.tipo ?? "arquetipo");
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Tipo">
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCarta)} className={SELECT}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Nome">
          <Input name="nome" defaultValue={carta?.nome} required className="h-10 text-lg md:text-lg" />
        </Campo>
      </div>
      {tipo === "caminho" && (
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Caminho">
            <select name="caminho" defaultValue={carta?.caminho ?? "amor"} className={SELECT}>
              {CAMINHOS.map((c) => (
                <option key={c.valor} value={c.valor}>{c.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Nível (I, II…)">
            <Input name="nivel" defaultValue={carta?.nivel ?? ""} className="h-10 text-lg md:text-lg" />
          </Campo>
        </div>
      )}
      {/* o jogador paga isto ao tocar em "Usar" na ficha; sem custo, a carta não tem botão */}
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Custo em PE">
          <Input
            key={tipo}
            name="custo_pe"
            type="number"
            min={0}
            max={50}
            defaultValue={carta?.custo_pe ?? (tipo === "trauma" ? 5 : 0)}
            className="h-10 text-lg md:text-lg"
          />
        </Campo>
        <Campo rotulo="Custo em Sinergia">
          <Input
            name="custo_sinergia"
            type="number"
            min={0}
            max={50}
            defaultValue={carta?.custo_sinergia ?? 0}
            className="h-10 text-lg md:text-lg"
          />
        </Campo>
      </div>
      {carta?.custo && (
        <Campo rotulo="Custo antigo (texto)">
          <Input name="custo" defaultValue={carta.custo} className="h-10 text-lg md:text-lg" />
        </Campo>
      )}
      <Campo rotulo="Citação">
        <Input name="citacao" defaultValue={carta?.citacao ?? ""} className="h-10 text-lg md:text-lg" />
      </Campo>
      <Campo rotulo="Efeitos (um por linha)">
        <Textarea name="efeitos" defaultValue={carta?.efeitos.join("\n") ?? ""} className="min-h-24 text-lg md:text-lg" />
      </Campo>
    </>
  );
}

// Campo de imagem opcional. As cartas do Compêndio já vêm com a arte; uma imagem enviada fica no lugar dela.
function CampoImagem({ atual, aoEscolher }: { atual: string | null; aoEscolher: (arquivo: File | null) => void }) {
  const [previa, setPrevia] = useState(atual);
  return (
    <Campo rotulo="Imagem (opcional)">
      <div className="flex items-center gap-3">
        <Miniatura url={previa} className="size-16" />
        <Input
          type="file"
          accept="image/*"
          className="h-10 text-base"
          onChange={(e) => {
            const arquivo = e.target.files?.[0] ?? null;
            aoEscolher(arquivo);
            setPrevia(arquivo ? URL.createObjectURL(arquivo) : atual);
          }}
        />
      </div>
    </Campo>
  );
}

type Edicao = { tipo: "item"; valor: ItemCatalogo | null } | { tipo: "carta"; valor: Carta | null };

export function Catalogo({
  mestreId,
  inicial,
}: {
  mestreId: string;
  inicial: { itens: ItemCatalogo[]; cartas: Carta[] };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [itens, setItens] = useState(inicial.itens);
  const [cartas, setCartas] = useState(inicial.cartas);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    apagarImagensSemUso(supabase).catch(() => {});
  }, [supabase]);
  const [apagando, setApagando] = useState<string | null>(null);

  function abrir(e: Edicao) {
    setImagem(null);
    setEdicao(e);
  }

  // grava a linha e, se escolheu imagem, sobe e troca a antiga
  async function salvar(form: FormData) {
    if (!edicao) return;
    const tabela = edicao.tipo === "item" ? "itens" : "cartas";
    const dados =
      edicao.tipo === "item"
        ? {
            nome: String(form.get("nome")).trim(),
            raridade: String(form.get("raridade")),
            dano: String(form.get("dano")).trim() || null,
            efeito: String(form.get("efeito")).trim() || null,
            descricao: String(form.get("descricao")).trim() || null,
            criador: String(form.get("criador")).trim() || null,
            max_memorias: Math.max(
              0,
              Math.min(MAX_MEMORIAS[String(form.get("raridade")) as Raridade] ?? 0, Number(form.get("max_memorias")) || 0),
            ),
          }
        : {
            tipo: String(form.get("tipo")),
            nome: String(form.get("nome")).trim(),
            citacao: String(form.get("citacao")).trim() || null,
            efeitos: String(form.get("efeitos"))
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
            custo: String(form.get("custo") ?? "").trim() || null,
            custo_pe: numeroDe(form.get("custo_pe")),
            custo_sinergia: numeroDe(form.get("custo_sinergia")),
            caminho: form.get("tipo") === "caminho" ? String(form.get("caminho")) : null,
            nivel: form.get("tipo") === "caminho" ? String(form.get("nivel")).trim() || null : null,
          };
    if (!dados.nome) return toast.error("Dê um nome");

    setSalvando(true);
    try {
      const antigo = edicao.valor;
      const { data, error } = antigo
        ? await supabase.from(tabela).update(dados).eq("id", antigo.id).select().single()
        : await supabase.from(tabela).insert({ ...dados, mestre_id: mestreId }).select().single();
      if (error) throw error;

      // sem imagem enviada, a carta do Compêndio mostra a arte embutida no app
      const arte = data.arte ? `/cartas/${data.arte}.webp` : null;
      let linha = { ...data, imagemUrl: (antigo?.imagem_path ? antigo.imagemUrl : null) ?? arte };
      if (edicao.tipo === "item") linha = { ...linha, memorias: await salvarMemorias(data.id, data.max_memorias, form) };
      if (imagem) {
        const { caminho, url } = await enviarImagemCatalogo(supabase, tabela, mestreId, data.id, imagem);
        const troca = await supabase.from(tabela).update({ imagem_path: caminho }).eq("id", data.id);
        if (troca.error) throw troca.error;
        if (antigo?.imagem_path) await supabase.storage.from(BUCKET_IMAGENS).remove([antigo.imagem_path]);
        linha = { ...linha, imagem_path: caminho, imagemUrl: url };
      }

      const colocar = <T extends { id: string; nome: string }>(lista: T[], novo: T) =>
        [...lista.filter((x) => x.id !== novo.id), novo].sort((a, b) => a.nome.localeCompare(b.nome));
      if (edicao.tipo === "item") setItens((lista) => colocar(lista, linha as ItemCatalogo));
      else
        setCartas((lista) =>
          // cartas por tipo (arquétipos, traumas…) e depois pelo nome
          colocar(lista, linha as Carta).sort(
            (a, b) => ORDEM_TIPOS.indexOf(a.tipo) - ORDEM_TIPOS.indexOf(b.tipo) || a.nome.localeCompare(b.nome),
          ),
        );
      toast.success(antigo ? "Salvo" : edicao.tipo === "item" ? "Item criado" : "Carta criada");
      setEdicao(null);
    } catch (erro) {
      toast.error(mensagemDeEnvio(erro));
    } finally {
      setSalvando(false);
    }
  }

  // as memórias do item: grava as preenchidas (na ordem I, II…) e apaga as que ficaram vazias ou acima do limite
  async function salvarMemorias(itemId: string, total: number, form: FormData): Promise<MemoriaItem[]> {
    const linhas = Array.from({ length: total }, (_, n) => ({
      item_id: itemId,
      ordem: n + 1,
      nome: String(form.get(`memoria_nome_${n + 1}`) ?? "").trim(),
      descricao: String(form.get(`memoria_descricao_${n + 1}`) ?? "").trim() || null,
      efeito: String(form.get(`memoria_efeito_${n + 1}`) ?? "").trim() || null,
    }));
    const preenchidas = linhas.filter((m) => m.nome);
    const vazias = Array.from({ length: 5 }, (_, n) => n + 1).filter((o) => !preenchidas.some((m) => m.ordem === o));
    if (vazias.length) {
      const { error } = await supabase.from("memorias_item").delete().eq("item_id", itemId).in("ordem", vazias);
      if (error) throw error;
    }
    if (!preenchidas.length) return [];
    const { data, error } = await supabase
      .from("memorias_item")
      .upsert(preenchidas, { onConflict: "item_id,ordem" })
      .select("id, ordem, nome, descricao, efeito");
    if (error) throw error;
    return ((data ?? []) as MemoriaItem[]).sort((a, b) => a.ordem - b.ordem);
  }

  async function apagar(tabela: "itens" | "cartas", x: { id: string; imagem_path: string | null }) {
    setApagando(null);
    const { error } = await supabase.from(tabela).delete().eq("id", x.id);
    if (error) return toast.error(error.message);
    if (x.imagem_path) await supabase.storage.from(BUCKET_IMAGENS).remove([x.imagem_path]);
    if (tabela === "itens") setItens((lista) => lista.filter((i) => i.id !== x.id));
    else setCartas((lista) => lista.filter((c) => c.id !== x.id));
    toast.success("Apagado");
  }

  function BotaoApagar({ tabela, x }: { tabela: "itens" | "cartas"; x: { id: string; nome: string; imagem_path: string | null } }) {
    return apagando === x.id ? (
      <Button variant="destructive" size="lg" onClick={() => apagar(tabela, x)} onBlur={() => setApagando(null)}>
        Apagar mesmo
      </Button>
    ) : (
      <Button variant="ghost" size="icon-lg" aria-label={`Apagar ${x.nome}`} onClick={() => setApagando(x.id)}>
        <Trash2 />
      </Button>
    );
  }

  return (
    <>
      <Tabs defaultValue="itens" className="gap-4">
        <TabsList className="h-11! w-full sm:w-80">
          <TabsTrigger value="itens" className="text-base">Itens ({itens.length})</TabsTrigger>
          <TabsTrigger value="cartas" className="text-base">Cartas ({cartas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="flex flex-col gap-3">
          <Button size="lg" className="self-start font-heading" onClick={() => abrir({ tipo: "item", valor: null })}>
            <Plus /> Novo item
          </Button>
          {itens.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
              {itens.map((i) => {
                const raridade = RARIDADES.find((r) => r.valor === i.raridade);
                return (
                  <li key={i.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 sm:gap-3">
                    <Miniatura url={i.imagemUrl} className="size-12 sm:size-16" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("line-clamp-2 font-rotulo text-base font-bold break-words uppercase", raridade?.cor)}>{i.nome}</p>
                      <p className="line-clamp-2 text-base leading-snug text-muted-foreground">
                        {raridade?.rotulo}
                        {i.dano && ` · ${i.dano} de dano`}
                        {i.efeito && ` · ${i.efeito}`}
                      </p>
                      <Estrelas total={i.max_memorias} acesas={0} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center">
                      <Button variant="ghost" size="icon-lg" aria-label={`Editar ${i.nome}`} onClick={() => abrir({ tipo: "item", valor: i })}>
                        <Pencil />
                      </Button>
                      <BotaoApagar tabela="itens" x={i} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio icone={Package} titulo="Nenhum item ainda">Crie o primeiro item para poder entregar aos jogadores.</Vazio>
          )}
        </TabsContent>

        <TabsContent value="cartas" className="flex flex-col gap-3">
          <Button size="lg" className="self-start font-heading" onClick={() => abrir({ tipo: "carta", valor: null })}>
            <Plus /> Nova carta
          </Button>
          {cartas.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
              {cartas.map((c) => {
                const tipo = TIPOS.find((t) => t.valor === c.tipo);
                const custo = textoDoCusto(c);
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 sm:gap-3">
                    <Miniatura url={c.imagemUrl} className="h-14 w-10 sm:h-16 sm:w-12" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-rotulo text-xs tracking-[0.2em] uppercase", tipo?.cor)}>
                        {c.tipo === "caminho" && c.caminho ? `${tipo?.rotulo} · ${nomeDoCaminho(c.caminho)}` : tipo?.rotulo}
                        {c.nivel && ` ${c.nivel}`}
                        {custo && <span className="text-muted-foreground"> · {custo}</span>}
                      </p>
                      <p className="line-clamp-2 font-rotulo text-base font-bold break-words uppercase">{c.nome}</p>
                      {c.citacao && <p className="line-clamp-2 text-base leading-snug text-muted-foreground italic">“{c.citacao}”</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center">
                      <Button variant="ghost" size="icon-lg" aria-label={`Editar ${c.nome}`} onClick={() => abrir({ tipo: "carta", valor: c })}>
                        <Pencil />
                      </Button>
                      <BotaoApagar tabela="cartas" x={c} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio icone={Layers} titulo="Nenhuma carta ainda">Crie arquétipos, traumas, habilidades únicas e de Caminho para dar aos jogadores.</Vazio>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={edicao !== null} onOpenChange={(aberto) => !aberto && setEdicao(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {edicao?.valor ? "Editar" : "Novo"} {edicao?.tipo === "item" ? "item" : "carta"}
            </DialogTitle>
          </DialogHeader>
          {edicao && (
            <form
              key={edicao.valor?.id ?? "novo"}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void salvar(new FormData(e.currentTarget));
              }}
            >
              {edicao.tipo === "item" ? (
                <CamposItem item={edicao.valor} />
              ) : (
                <CamposCarta carta={edicao.valor} />
              )}
              <CampoImagem atual={edicao.valor?.imagemUrl ?? null} aoEscolher={setImagem} />
              <div className="sticky -bottom-4 z-10 -mx-4 border-t border-border bg-popover px-4 pt-3 pb-4">
                <Button type="submit" size="lg" disabled={salvando} className="h-11 w-full font-heading">
                  {salvando ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
