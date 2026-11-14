// Service worker do A Silent Machine. Faz duas coisas:
// 1. Sem internet ao abrir uma página, mostra /offline.html em vez da tela de erro do navegador.
// 2. Guarda no celular as imagens do RPG (retratos, itens, cartas). A URL assinada muda a cada abertura
//    da ficha, mas o arquivo não: cada envio ganha um nome novo. Então a imagem é guardada pelo caminho,
//    sem o token, e só é baixada uma vez.
// Todo o resto (fichas, Supabase, ao vivo) vai direto para a rede.
const CACHE = "asm-offline-v1";
const CACHE_IMAGENS = "asm-imagens-v1"; // o botão Sair (components/BotaoSair.tsx) apaga este cache
const LIMITE_IMAGENS = 300;
const OFFLINE = "/offline.html";
const GUARDADOS = [OFFLINE, "/icones/icone-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(GUARDADOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // apaga caches de versões antigas deste arquivo
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(nomes.filter((n) => n !== CACHE && n !== CACHE_IMAGENS).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }
  const chave = chaveDaImagem(request);
  if (chave) event.respondWith(imagemGuardada(request, chave));
});

// .../storage/v1/object/sign/imagens/{caminho}?token=...  →  .../storage/v1/object/sign/imagens/{caminho}
function chaveDaImagem(request) {
  if (request.method !== "GET" || request.destination !== "image") return null;
  const url = new URL(request.url);
  if (!url.pathname.includes("/storage/v1/object/sign/imagens/")) return null;
  return url.origin + url.pathname;
}

async function imagemGuardada(request, chave) {
  const cache = await caches.open(CACHE_IMAGENS);
  const guardada = await cache.match(chave);
  if (guardada) return guardada;

  // pede com CORS para a resposta poder ser guardada sem o "peso extra" das respostas opacas
  const resposta = await fetch(request.url, { mode: "cors", credentials: "omit" }).catch(() => fetch(request));
  // respostas opacas (sem CORS) têm ok = false e ficam de fora
  if (resposta.ok) {
    await cache.put(chave, resposta.clone());
    aparar(cache);
  }
  return resposta;
}

// mantém só as últimas LIMITE_IMAGENS imagens (as mais antigas saem primeiro)
async function aparar(cache) {
  const chaves = await cache.keys();
  await Promise.all(chaves.slice(0, Math.max(0, chaves.length - LIMITE_IMAGENS)).map((c) => cache.delete(c)));
}
