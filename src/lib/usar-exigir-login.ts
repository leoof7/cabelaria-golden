"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

// Redireciona pro login se não tiver sessão, e devolve se pode mostrar a
// tela (perfil já liberado pelo dono) ou não (ainda carregando/pendente).
export function useExigirLogin() {
  const router = useRouter();
  const { carregando, sessao, perfil } = useAuth();

  useEffect(() => {
    if (!carregando && !sessao) router.push("/login");
  }, [carregando, sessao, router]);

  const pronto = !carregando && !!sessao && !!perfil;

  return { pronto, perfil, ehDono: perfil?.papel === "dono" };
}
