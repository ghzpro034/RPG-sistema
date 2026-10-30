// Gera todos os ícones do app (PWA, favicon, iPhone) a partir de um arquivo de origem.
// Uso: node scripts/gerar-icones.mjs [origem]
//   origem: SVG ou PNG quadrado (de preferência 1024px). Padrão: scripts/icone-origem.svg
// Para trocar pelo símbolo oficial do RPG: substitua a origem e rode de novo.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const raiz = path.resolve(import.meta.dirname, "..");
const origem = path.resolve(process.argv[2] ?? path.join(raiz, "scripts/icone-origem.svg"));
const FUNDO = "#000000";

// "maskable": o Android recorta em círculo/gota; o desenho precisa caber nos 80% do meio
async function gerar(destino, tamanho, { margem = 0 } = {}) {
  const miolo = Math.round(tamanho * (1 - margem * 2));
  const desenho = await sharp(origem, { density: 512 }).resize(miolo, miolo, { fit: "contain", background: FUNDO }).png().toBuffer();
  await mkdir(path.dirname(destino), { recursive: true });
  await sharp({ create: { width: tamanho, height: tamanho, channels: 4, background: FUNDO } })
    .composite([{ input: desenho, gravity: "center" }])
    .png()
    .toFile(destino);
  console.log("ok", path.relative(raiz, destino));
}

await gerar(path.join(raiz, "public/icones/icone-192.png"), 192);
await gerar(path.join(raiz, "public/icones/icone-512.png"), 512);
await gerar(path.join(raiz, "public/icones/icone-maskable-512.png"), 512, { margem: 0.1 });
// convenções do Next: app/icon.png vira o favicon e app/apple-icon.png o ícone do iPhone
await gerar(path.join(raiz, "app/icon.png"), 64);
await gerar(path.join(raiz, "app/apple-icon.png"), 180, { margem: 0.06 });
