import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

// Corpo do texto: sem-serifa grossa, pedida na identidade visual.
const geistSans = Geist({
  variable: "--font-corpo",
  subsets: ["latin"],
});

// Títulos: serifa maiúscula com espaçamento, ecoando a logo da marca.
const playfairDisplay = Playfair_Display({
  variable: "--font-titulo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cabelaria Golden",
  description: "Agenda, caixa e fila de espera da Cabelaria Golden",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fundo text-texto-principal">
        {children}
      </body>
    </html>
  );
}
