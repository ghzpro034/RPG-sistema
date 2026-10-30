import { redirect } from "next/navigation";
import { Suspense } from "react";
import { destinoDe, obterSessao } from "@/lib/sessao";

async function Redirecionar() {
  redirect(destinoDe(await obterSessao()));
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={<p className="m-auto text-xl text-muted-foreground">Carregando…</p>}>
      <Redirecionar />
    </Suspense>
  );
}
