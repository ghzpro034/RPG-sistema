"use client";

import { Camera, Loader2, Shield } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TextoEditavel } from "@/components/ficha/campos";
import { useFicha } from "@/components/ficha/contexto";
import { BUCKET_IMAGENS, VALIDADE_URL, type Carta } from "@/lib/ficha-tipos";
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

  return (
    <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="relative shrink-0">
        <div className="h-56 w-44 overflow-hidden rounded-[50%] border-2 border-white/15 bg-secondary shadow-xl shadow-black">
          {retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Supabase, já comprimida
            <img src={retratoUrl} alt={`Retrato de ${p.nome}`} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-heading text-6xl text-white/20">
              {p.nome.charAt(0)}
            </span>
          )}
        </div>

        {/* medalhão do nível */}
        <div className="absolute -top-1 -right-3 flex size-14 items-center justify-center rounded-full border-4 border-double border-white/60 bg-secondary font-heading text-2xl font-bold">
          {editando ? (
            <TextoEditavel
              valor={p.nivel ?? ""}
              aoSalvar={(nivel) => salvar({ nivel })}
              editavel
              rotulo="Nível"
              campoClassName="h-9 w-11 border-0 bg-transparent px-0 text-center font-heading text-xl font-bold"
            />
          ) : (
            p.nivel
          )}
        </div>

        {/* escudo da defesa */}
        <div className="absolute -right-3 bottom-2 flex size-14 items-center justify-center" aria-label={`Defesa ${p.defesa}`}>
          <Shield className="absolute size-14 fill-secondary text-white/60" aria-hidden />
          <span className="relative font-heading text-xl font-bold">{p.defesa}</span>
        </div>

        {/* só o mestre troca imagens */}
        {editando && souMestre && (
          <>
            <button
              type="button"
              onClick={() => arquivo.current?.click()}
              disabled={enviando}
              className="absolute inset-x-6 bottom-6 flex items-center justify-center gap-1.5 rounded-md bg-background/85 py-2 text-base backdrop-blur hover:bg-background"
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

      <div className="flex w-full min-w-0 flex-1 flex-col gap-4 text-center">
        <div>
          <p className="text-base text-ouro/80 italic">{p.nome}</p>
          {editando ? (
            <TextoEditavel
              valor={p.nome}
              aoSalvar={(nome) => nome && salvar({ nome })}
              editavel
              rotulo="Nome do personagem"
              campoClassName="mt-1 h-12 text-center font-heading text-2xl md:text-2xl"
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-wide break-words uppercase sm:text-4xl">{p.nome}</h1>
          )}
        </div>

        <TextoEditavel
          valor={p.descricao ?? ""}
          aoSalvar={(descricao) => salvar({ descricao })}
          editavel={editando}
          rotulo="Descrição"
          multilinha
          placeholder="Sem descrição ainda."
          className="text-left text-lg leading-snug sm:text-justify"
        />

        <div className="flex flex-col items-center gap-0.5 font-heading text-base font-bold tracking-wide uppercase">
          {editando ? (
            <TextoEditavel
              valor={p.caminho ?? ""}
              aoSalvar={(caminho) => salvar({ caminho })}
              editavel
              rotulo="Caminho"
              placeholder="Caminho da…"
              campoClassName="text-center"
            />
          ) : (
            p.caminho && <span className="text-caminho italic">{p.caminho}</span>
          )}
          {arquetipos.length > 0 && <span>{arquetipos.map((c) => c.nome).join(" - ")}</span>}
          {traumas.map((c) => (
            <span key={c.id} className="text-instavel">
              {c.nome}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
