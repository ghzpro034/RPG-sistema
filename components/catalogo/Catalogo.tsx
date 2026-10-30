"use client";

import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BUCKET_IMAGENS, type Carta, type ItemCatalogo, type Raridade, type TipoCarta } from "@/lib/ficha-tipos";
import { enviarImagemCatalogo } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";

const RARIDADES: { valor: Raridade; rotulo: string; cor: string }[] = [
  { valor: "comum", rotulo: "Comum", cor: "text-comum" },
  { valor: "incomum", rotulo: "Incomum", cor: "text-incomum" },
  { valor: "unico", rotulo: "Único", cor: "text-unico" },
];

const TIPOS: { valor: TipoCarta; rotulo: string; cor: string }[] = [
  { valor: "arquetipo", rotulo: "Arquétipo", cor: "text-ouro" },
  { valor: "trauma", rotulo: "Trauma", cor: "text-instavel" },
  { valor: "habilidade", rotulo: "Habilidade", cor: "text-social" },
  { valor: "revolta", rotulo: "Revolta", cor: "text-caminho" },
];

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

// Campo de imagem opcional: as artes do RPG podem entrar depois.
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
  campanhaId,
  inicial,
}: {
  campanhaId: string;
  inicial: { itens: ItemCatalogo[]; cartas: Carta[] };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [itens, setItens] = useState(inicial.itens);
  const [cartas, setCartas] = useState(inicial.cartas);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
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
            efeito: String(form.get("efeito")).trim() || null,
            descricao: String(form.get("descricao")).trim() || null,
            max_memorias: Math.max(0, Math.min(5, Number(form.get("max_memorias")) || 0)),
          }
        : {
            tipo: String(form.get("tipo")),
            nome: String(form.get("nome")).trim(),
            citacao: String(form.get("citacao")).trim() || null,
            efeitos: String(form.get("efeitos"))
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
            custo: String(form.get("custo")).trim() || null,
          };
    if (!dados.nome) return toast.error("Dê um nome");

    setSalvando(true);
    try {
      const antigo = edicao.valor;
      const { data, error } = antigo
        ? await supabase.from(tabela).update(dados).eq("id", antigo.id).select().single()
        : await supabase.from(tabela).insert({ ...dados, campanha_id: campanhaId }).select().single();
      if (error) throw error;

      let linha = { ...data, imagemUrl: antigo?.imagemUrl ?? null };
      if (imagem) {
        const { caminho, url } = await enviarImagemCatalogo(supabase, tabela, campanhaId, data.id, imagem);
        const troca = await supabase.from(tabela).update({ imagem_path: caminho }).eq("id", data.id);
        if (troca.error) throw troca.error;
        if (antigo?.imagem_path) await supabase.storage.from(BUCKET_IMAGENS).remove([antigo.imagem_path]);
        linha = { ...linha, imagem_path: caminho, imagemUrl: url };
      }

      const colocar = <T extends { id: string; nome: string }>(lista: T[], novo: T) =>
        [...lista.filter((x) => x.id !== novo.id), novo].sort((a, b) => a.nome.localeCompare(b.nome));
      if (edicao.tipo === "item") setItens((lista) => colocar(lista, linha as ItemCatalogo));
      else setCartas((lista) => colocar(lista, linha as Carta));
      toast.success(antigo ? "Salvo" : edicao.tipo === "item" ? "Item criado" : "Carta criada");
      setEdicao(null);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
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
          <Button size="lg" className="self-start font-heading tracking-wider" onClick={() => abrir({ tipo: "item", valor: null })}>
            <Plus /> Novo item
          </Button>
          {itens.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {itens.map((i) => {
                const raridade = RARIDADES.find((r) => r.valor === i.raridade);
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <Miniatura url={i.imagemUrl} className="size-16" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate font-heading text-base font-bold uppercase", raridade?.cor)}>{i.nome}</p>
                      <p className="truncate text-base text-muted-foreground">
                        {raridade?.rotulo}
                        {i.efeito && ` · ${i.efeito}`}
                        {i.max_memorias > 0 && ` · ${i.max_memorias} memória(s)`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-lg" aria-label={`Editar ${i.nome}`} onClick={() => abrir({ tipo: "item", valor: i })}>
                      <Pencil />
                    </Button>
                    <BotaoApagar tabela="itens" x={i} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-lg text-muted-foreground">Nenhum item no catálogo ainda.</p>
          )}
        </TabsContent>

        <TabsContent value="cartas" className="flex flex-col gap-3">
          <Button size="lg" className="self-start font-heading tracking-wider" onClick={() => abrir({ tipo: "carta", valor: null })}>
            <Plus /> Nova carta
          </Button>
          {cartas.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {cartas.map((c) => {
                const tipo = TIPOS.find((t) => t.valor === c.tipo);
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <Miniatura url={c.imagemUrl} className="h-16 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-heading text-xs tracking-[0.2em] uppercase", tipo?.cor)}>{tipo?.rotulo}</p>
                      <p className="truncate font-heading text-base font-bold uppercase">{c.nome}</p>
                      {c.citacao && <p className="truncate text-base text-muted-foreground italic">“{c.citacao}”</p>}
                    </div>
                    <Button variant="ghost" size="icon-lg" aria-label={`Editar ${c.nome}`} onClick={() => abrir({ tipo: "carta", valor: c })}>
                      <Pencil />
                    </Button>
                    <BotaoApagar tabela="cartas" x={c} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-lg text-muted-foreground">Nenhuma carta no catálogo ainda.</p>
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
                <>
                  <Campo rotulo="Nome">
                    <Input name="nome" defaultValue={edicao.valor?.nome} required className="h-10 text-lg md:text-lg" />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Raridade">
                      <select name="raridade" defaultValue={edicao.valor?.raridade ?? "comum"} className={SELECT}>
                        {RARIDADES.map((r) => (
                          <option key={r.valor} value={r.valor}>{r.rotulo}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo rotulo="Memórias (0 a 5)">
                      <Input name="max_memorias" type="number" min={0} max={5} defaultValue={edicao.valor?.max_memorias ?? 0} className="h-10 text-lg md:text-lg" />
                    </Campo>
                  </div>
                  <Campo rotulo="Efeito (ex.: D10 de dano + fragmento)">
                    <Input name="efeito" defaultValue={edicao.valor?.efeito ?? ""} className="h-10 text-lg md:text-lg" />
                  </Campo>
                  <Campo rotulo="Descrição">
                    <Textarea name="descricao" defaultValue={edicao.valor?.descricao ?? ""} className="min-h-20 text-lg md:text-lg" />
                  </Campo>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Tipo">
                      <select name="tipo" defaultValue={edicao.valor?.tipo ?? "arquetipo"} className={SELECT}>
                        {TIPOS.map((t) => (
                          <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo rotulo="Custo (opcional)">
                      <Input name="custo" defaultValue={edicao.valor?.custo ?? ""} placeholder="Ponto de Sinergia" className="h-10 text-lg md:text-lg" />
                    </Campo>
                  </div>
                  <Campo rotulo="Nome">
                    <Input name="nome" defaultValue={edicao.valor?.nome} required className="h-10 text-lg md:text-lg" />
                  </Campo>
                  <Campo rotulo="Citação">
                    <Input name="citacao" defaultValue={edicao.valor?.citacao ?? ""} className="h-10 text-lg md:text-lg" />
                  </Campo>
                  <Campo rotulo="Efeitos (um por linha)">
                    <Textarea name="efeitos" defaultValue={edicao.valor?.efeitos.join("\n") ?? ""} className="min-h-24 text-lg md:text-lg" />
                  </Campo>
                </>
              )}
              <CampoImagem atual={edicao.valor?.imagemUrl ?? null} aoEscolher={setImagem} />
              <Button type="submit" size="lg" disabled={salvando} className="font-heading tracking-wider">
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
