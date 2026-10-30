import { History } from "lucide-react";
import type { Alteracao } from "@/lib/mesa";

// nomes legíveis dos campos da ficha; o que não está aqui não aparece no histórico
const CAMPOS: Record<string, string> = {
  nome: "Nome",
  nivel: "Nível",
  descricao: "Descrição",
  caminho: "Caminho",
  vida: "Vida",
  vida_max: "Vida máx.",
  defesa: "Defesa",
  corrupcao: "Corrupção",
  congelado: "Congelamento",
  dentes: "Dentes",
  pe: "PE",
  pe_max: "PE máx.",
  conhecimentos: "Conhecimentos",
  enganou_morte: "Enganou a morte",
  travas: "Travas",
  retrato_path: "Retrato",
};

const CURTOS = new Set(["vida", "vida_max", "defesa", "corrupcao", "congelado", "dentes", "pe", "pe_max", "nivel"]);

function descrever(a: Alteracao) {
  if (a.tabela === "atributos") return { campo: a.campo, mudanca: `${a.de} → ${a.para}` };
  if (a.tabela === "memorias") return { campo: a.campo, mudanca: `memórias ${a.de} → ${a.para}` };
  if (a.tabela === "inventario") {
    if (a.de === null) return { campo: a.campo, mudanca: `recebeu ${a.para}` };
    if (a.para === null) return { campo: a.campo, mudanca: "removido" };
    return { campo: a.campo, mudanca: `${a.de} → ${a.para}` };
  }
  const rotulo = CAMPOS[a.campo];
  if (!rotulo) return null;
  if (a.campo === "enganou_morte") return { campo: rotulo, mudanca: a.para === "true" ? "usado" : "devolvido" };
  return { campo: rotulo, mudanca: CURTOS.has(a.campo) ? `${a.de} → ${a.para}` : "alterado" };
}

export function HistoricoAlteracoes({
  alteracoes,
  nomes,
  autores,
}: {
  alteracoes: Alteracao[];
  nomes: Map<string, string>;
  autores: Record<string, string>;
}) {
  const linhas = alteracoes.flatMap((a) => {
    const d = descrever(a);
    return d ? [{ ...a, ...d }] : [];
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg tracking-wide">
        <History className="size-5 text-muted-foreground" aria-hidden /> Histórico
      </h2>
      {linhas.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card" aria-live="polite">
          {linhas.map((a) => (
            <li key={a.id} className="flex items-baseline gap-2 px-3 py-2 text-base leading-snug">
              <span className="min-w-0 flex-1">
                <b>{(a.personagem_id && nomes.get(a.personagem_id)) ?? "?"}</b> · {a.campo}{" "}
                <span className="text-muted-foreground">{a.mudanca}</span>
                {a.autor_id && <span className="text-muted-foreground"> · {autores[a.autor_id] ?? "?"}</span>}
              </span>
              <time className="shrink-0 text-sm text-muted-foreground tabular-nums" suppressHydrationWarning>
                {new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted-foreground">Nenhuma alteração ainda.</p>
      )}
    </section>
  );
}
