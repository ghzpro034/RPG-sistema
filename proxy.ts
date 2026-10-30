import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    // tudo, menos arquivos estáticos, imagens e os arquivos do app instalável (o navegador os pede sem login)
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
