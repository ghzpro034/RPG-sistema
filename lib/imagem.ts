import type { SupabaseClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import { BUCKET_IMAGENS, VALIDADE_URL } from "@/lib/ficha-tipos";

// Comprime para WebP (~150 KB) antes de subir, para caber folgado no 1 GB do plano grátis.
export function comprimirParaWebp(arquivo: File, ladoMaximo = 800) {
  return imageCompression(arquivo, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: ladoMaximo,
    fileType: "image/webp",
    useWebWorker: true,
  });
}

// Imagem do catálogo do mestre: {campanha}/{itens|cartas}/{id}.{carimbo}.webp
// (nome novo a cada troca para a imagem antiga não ficar presa no cache)
export async function enviarImagemCatalogo(
  supabase: SupabaseClient,
  pasta: "itens" | "cartas",
  campanhaId: string,
  id: string,
  arquivo: File,
) {
  const webp = await comprimirParaWebp(arquivo);
  const caminho = `${campanhaId}/${pasta}/${id}.${Date.now()}.webp`;
  const { error } = await supabase.storage.from(BUCKET_IMAGENS).upload(caminho, webp, { contentType: "image/webp" });
  if (error) throw error;
  const { data } = await supabase.storage.from(BUCKET_IMAGENS).createSignedUrl(caminho, VALIDADE_URL);
  return { caminho, url: data?.signedUrl ?? null };
}
