import type { MetadataRoute } from "next";

// Faz o site virar "app" no celular: ícone na tela inicial e abertura em tela cheia.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "A Silent Machine",
    short_name: "Silent Machine",
    description: "Fichas da mesa de A Silent Machine",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
