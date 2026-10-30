import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Cinzel: títulos e números da ficha
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
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
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${cinzel.variable} ${cormorant.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster theme="dark" richColors />
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
