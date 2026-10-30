import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond } from "next/font/google";
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
  title: "Grimório",
  description: "Fichas da mesa de RPG",
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
      </body>
    </html>
  );
}
