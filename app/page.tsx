import { redirect } from "next/navigation";
import { Suspense } from "react";
import { destinoDe, obterSessao } from "@/lib/sessao";
import { CarregandoTela } from "@/components/Estados";

async function Redirecionar() {
  redirect(destinoDe(await obterSessao()));
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={<CarregandoTela />}>
      <Redirecionar />
    </Suspense>
  );
}
