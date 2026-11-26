"use client";

import { Camera, Loader2, Shield } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TextoEditavel } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import {
  BUCKET_IMAGENS,
  CAMINHOS,
  RACAS,
  VALIDADE_URL,
  nomeDoCaminho,
  type Caminho,
  type Carta,
  type Raca,
} from "@/lib/ficha-tipos";
import { comprimirParaWebp, mensagemDeEnvio } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";

export function Cabecalho({ retratoInicial, cartas }: { retratoInicial: string | null; cartas: Carta[] }) {
  const { personagem: p, editando, salvar, souMestre } = useFicha();
  const supabase = useMemo(() => createClient(), []);
  const [retratoUrl, setRetratoUrl] = useState(retratoInicial);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const arquetipos = cartas.filter((c) => c.tipo === "arquetipo");
  const traumas = cartas.filter((c) => c.tipo === "trauma");

  async function trocarRetrato(foto: File) {
    setEnviando(true);
    try {
      const webp = await comprimirParaWebp(foto);
      // nome novo a cada troca: evita a foto antiga presa no cache
      const caminho = `${p.campanha_id}/retratos/${p.id}.${Date.now()}.webp`;
      const envio = await supabase.storage
        .from(BUCKET_IMAGENS)
        .upload(caminho, webp, { contentType: "image/webp" });
      if (envio.error) throw envio.error;

      const antigo = p.retrato_path;
      if (!(await salvar({ retrato_path: caminho }))) return;

      const { data } = await supabase.storage.from(BUCKET_IMAGENS).createSignedUrl(caminho, VALIDADE_URL);
      setRetratoUrl(data?.signedUrl ?? null);
      if (antigo) await supabase.storage.from(BUCKET_IMAGENS).remove([antigo]);
      toast.success("Retrato atualizado");
    } catch (erro) {
      toast.error(mensagemDeEnvio(erro));
    } finally {
      setEnviando(false);
    }
  }

  // No celular: retrato pequeno ao lado do nome, para a vida e o dado aparecerem logo.
  // Do tablet para cima: retrato grande à esquerda, como no Canva.
  return (
    <section className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-5 gap-y-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start sm:gap-x-8">
      <div className="relative sm:row-span-2">
        <div className="h-36 w-28 overflow-hidden rounded-[50%] border-2 border-white/15 bg-secondary shadow-xl shadow-black sm:h-56 sm:w-44">
          {retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase, já comprimida
            <img src={retratoUrl} alt={`Retrato de ${p.nome}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-rotulo text-5xl text-white/20 sm:text-6xl">
              {p.nome.charAt(0)}
            </span>
          )}
        </div>

        {/* medalhão do nível: o selo serrilhado da ficha do Canva */}
        <div
          className="absolute -top-1 -right-3 flex size-11 items-center justify-center rounded-full border-[3px] border-dashed border-white/60 bg-secondary font-sans text-xl font-bold shadow-[inset_0_0_0_2px_var(--secondary),inset_0_0_0_3px_rgba(255,255,255,0.45)] sm:size-14 sm:text-2xl"
          aria-label={`Nível Cósmico ${p.nivel ?? ""}`}
        >
          {editando ? (
            <TextoEditavel
              valor={p.nivel ?? ""}
              aoSalvar={(nivel) => salvar({ nivel })}
              editavel
              rotulo="Nível Cósmico"
              campoClassName="h-9 w-10 border-0 bg-transparent px-0 text-center font-sans text-lg font-bold"
            />
          ) : (
            p.nivel
          )}
        </div>

        {/* escudo da proteção (armadura) */}
        <div
          className="absolute -right-3 bottom-1 flex size-11 items-center justify-center sm:bottom-2 sm:size-14"
          aria-label={`Proteção ${p.defesa}`}
          title="Pontos de Proteção"
        >
          <Shield className="absolute size-11 fill-secondary text-white/60 sm:size-14" aria-hidden />
          <span className="relative font-heading text-lg font-bold sm:text-xl">{p.defesa}</span>
        </div>

        {/* só o mestre troca imagens */}
        {editando && souMestre && (
          <>
            <button
              type="button"
              onClick={() => arquivo.current?.click()}
              disabled={enviando}
              className="absolute inset-x-1 bottom-3 flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-background/85 text-base backdrop-blur hover:bg-background sm:inset-x-6 sm:bottom-6"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {enviando ? "Enviando…" : "Trocar foto"}
            </button>
            <input
              ref={arquivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const foto = e.target.files?.[0];
                e.target.value = "";
                if (foto) void trocarRetrato(foto);
              }}
            />
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <p className="text-base text-ouro/80 italic">{p.nome}</p>
          {editando ? (
            <TextoEditavel
              valor={p.nome}
              aoSalvar={(nome) => nome && salvar({ nome })}
              editavel
              rotulo="Nome do personagem"
              campoClassName="mt-1 h-12 font-heading text-xl md:text-2xl"
            />
          ) : (
            <h1 className="text-2xl leading-tight font-bold break-words sm:text-4xl">{p.nome}</h1>
          )}
          {/* raça: só o mestre escolhe */}
          {editando && souMestre ? (
            <select
              value={p.raca ?? ""}
              onChange={(e) => salvar({ raca: (e.target.value || null) as Raca | null })}
              aria-label="Raça"
              className="mt-2 h-10 rounded-md border border-input bg-transparent px-2 text-lg"
            >
              <option value="">Raça não definida</option>
              {RACAS.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.nome}
                </option>
              ))}
            </select>
          ) : (
            p.raca && (
              <p className="font-rotulo text-sm tracking-[0.2em] text-muted-foreground uppercase">
                {RACAS.find((r) => r.valor === p.raca)?.nome}
              </p>
            )
          )}
        </div>

        <div className="flex flex-col gap-0.5 font-rotulo text-sm font-bold tracking-wide uppercase sm:text-base">
          {/* o Caminho se aprende com quem já o tem: só o mestre escolhe */}
          {editando && souMestre ? (
            <select
              value={p.caminho ?? ""}
              onChange={(e) => salvar({ caminho: (e.target.value || null) as Caminho | null })}
              aria-label="Caminho"
              className="h-10 self-start rounded-md border border-input bg-transparent px-2 font-sans text-lg font-normal normal-case"
            >
              <option value="">Sem Caminho</option>
              {CAMINHOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  Caminho {c.valor === "amor" ? "do" : "da"} {c.nome}
                </option>
              ))}
            </select>
          ) : (
            p.caminho && (
              <span className="text-caminho italic">
                Caminho {p.caminho === "amor" ? "do" : "da"} {nomeDoCaminho(p.caminho)}
              </span>
            )
          )}
          {arquetipos.length > 0 && <span>{arquetipos.map((c) => c.nome).join(" - ")}</span>}
          {traumas.map((c) => (
            <span key={c.id} className="text-instavel">
              {/^trauma/i.test(c.nome) ? c.nome : `Trauma de ${c.nome}`}
            </span>
          ))}
        </div>
      </div>

      <TextoEditavel
        valor={p.descricao ?? ""}
        aoSalvar={(descricao) => salvar({ descricao })}
        editavel={editando}
        rotulo="Descrição"
        multilinha
        placeholder="Sem descrição ainda."
        className="col-span-2 text-lg leading-snug sm:col-span-1 sm:col-start-2 sm:text-justify"
        campoClassName="col-span-2 sm:col-span-1 sm:col-start-2"
      />
    </section>
  );
}
