import type { Metadata, Viewport } from "next";
import { Belleza, Cormorant_Garamond, Grenze_Gotisch } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { SemInternet } from "@/components/SemInternet";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Grenze Gotisch: a serifa condensada de gravura das cartas ("O Explorador") e da ficha física (títulos, nomes, números)
const grenze = Grenze_Gotisch({
  variable: "--font-grenze",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Belleza: a sans dos rótulos ("TRAUMA", "FORÇA", "MENOS DE")
const belleza = Belleza({
  variable: "--font-belleza",
  subsets: ["latin"],
  weight: "400",
});

// Cormorant Garamond: texto corrido
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "A Silent Machine",
  description: "Fichas da mesa de A Silent Machine",
  applicationName: "A Silent Machine",
  // iPhone: "Adicionar à Tela de Início" abre em tela cheia, com a barra de status preta
  appleWebApp: { capable: true, title: "Silent Machine", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // ocupa a tela toda no iPhone; as margens seguras (entalhe, barra de gestos) ficam em globals.css e no painel do dado
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${grenze.variable} ${belleza.variable} ${cormorant.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SemInternet />
        {children}
        <Toaster theme="dark" richColors />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
