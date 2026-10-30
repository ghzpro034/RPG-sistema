import imageCompression from "browser-image-compression";

// Comprime para WebP (~150 KB) antes de subir, para caber folgado no 1 GB do plano grátis.
export function comprimirParaWebp(arquivo: File, ladoMaximo = 800) {
  return imageCompression(arquivo, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: ladoMaximo,
    fileType: "image/webp",
    useWebWorker: true,
  });
}
