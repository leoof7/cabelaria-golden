import type { NextConfig } from "next";

// Fase 1: hospedagem no GitHub Pages, que só serve site estático (sem
// servidor). "output: export" gera HTML/JS puro em vez de rodar Node.
// "basePath" é o nome do repositório, porque o GitHub Pages publica o
// projeto dentro de um subcaminho (usuario.github.io/nome-do-repo).
// Ajuste NOME_DO_REPOSITORIO se o repositório no GitHub tiver outro nome.
const NOME_DO_REPOSITORIO = "cabelaria-golden";

const nextConfig: NextConfig = {
  output: "export",
  basePath: `/${NOME_DO_REPOSITORIO}`,
  images: {
    unoptimized: true, // a otimização de imagem do Next.js precisa de servidor
  },
};

export default nextConfig;
