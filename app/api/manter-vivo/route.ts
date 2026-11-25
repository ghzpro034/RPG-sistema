// Batimento diário do Vercel Cron (ver vercel.json): faz uma escrita de verdade no banco para o Supabase grátis
// não pausar por falta de uso. Se a variável CRON_SECRET existir na Vercel, só aceita a chamada do próprio cron.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return Response.json({ ok: false, erro: "Supabase não configurado" }, { status: 500 });

  try {
    const resposta = await fetch(`${url}/rest/v1/rpc/manter_vivo`, {
      method: "POST",
      headers: { apikey: chave, "Content-Type": "application/json" },
      body: JSON.stringify({ p_origem: "vercel-cron" }),
      cache: "no-store",
    });
    // 5xx ou falha de rede: o projeto pode estar pausado; o cron marca a execução como erro
    return Response.json({ ok: resposta.ok, supabase: resposta.status }, { status: resposta.ok ? 200 : 502 });
  } catch {
    return Response.json({ ok: false, erro: "Supabase não respondeu" }, { status: 502 });
  }
}
