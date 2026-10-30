import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

// Nome único por assinatura: o cliente reaproveita canais de mesmo nome, e dois componentes
// (ou um que remonta antes do antigo sair) acabariam no mesmo canal já assinado.
export function nomeCanal(base: string) {
  return `${base}-${crypto.randomUUID()}`;
}
