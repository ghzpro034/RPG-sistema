// Service worker do A Silent Machine.
// Só faz uma coisa: se o celular estiver sem internet ao abrir uma página, mostra /offline.html
// em vez da tela de erro do navegador. Todo o resto (fichas, Supabase, ao vivo) vai direto para a rede.
const CACHE = "asm-offline-v1";
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
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
