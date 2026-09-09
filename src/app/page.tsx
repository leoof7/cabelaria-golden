"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const { carregando, sessao, perfil } = useAuth();

  useEffect(() => {
    if (!carregando && !sessao) {
      router.push("/login");
    }
  }, [carregando, sessao, router]);

  if (carregando || !sessao) {
    return <TelaCarregando />;
  }

  // Conta criada, mas o dono ainda não vinculou papel/cadeira.
  if (!perfil) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="titulo-marca text-2xl text-dourado">
          Conta criada
        </h1>
        <p className="max-w-xs text-texto-secundario">
          Falta o dono liberar seu acesso. Assim que ele vincular seu login a
          um papel, essa tela muda sozinha.
        </p>
        <BotaoSair />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="titulo-marca text-2xl text-dourado">
          Cabelaria Golden
        </h1>
        <p className="text-sm text-texto-secundario">
          Logado como <strong className="text-texto-principal">{rotuloPapel(perfil.papel)}</strong>
        </p>
      </div>
      <div className="divisoria-metalica" />

      <nav className="grid grid-cols-1 gap-3">
        <CartaoAtalho href="/agenda" titulo="Agenda do dia" />
        <CartaoAtalho href="/fila" titulo="Fila de espera" />
        <CartaoAtalho href="/profissionais" titulo="Profissionais" />
        <CartaoAtalho href="/servicos" titulo="Serviços" />
        <CartaoAtalho href="/clientes" titulo="Clientes" />
        {perfil.papel === "dono" && (
          <>
            <CartaoAtalho href="/caixa" titulo="Caixa" />
            <CartaoAtalho href="/fechamento" titulo="Fechamento do dia" />
            <CartaoAtalho href="/usuarios" titulo="Acessos da equipe" />
          </>
        )}
      </nav>

      <div className="mt-auto pt-6">
        <BotaoSair />
      </div>
    </div>
  );
}

function CartaoAtalho({ href, titulo }: { href: string; titulo: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-cartao px-5 py-4 text-lg font-semibold text-texto-principal outline-none transition-colors hover:bg-dourado-escuro/20 focus-visible:ring-2 focus-visible:ring-dourado"
    >
      {titulo}
    </Link>
  );
}

function BotaoSair() {
  return (
    <button
      type="button"
      onClick={() => supabase.auth.signOut()}
      className="w-full rounded-lg border border-dourado-escuro py-3 text-sm font-semibold text-texto-secundario outline-none focus-visible:ring-2 focus-visible:ring-dourado"
    >
      Sair
    </button>
  );
}

function TelaCarregando() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-texto-secundario">Carregando...</p>
    </div>
  );
}

function rotuloPapel(papel: "dono" | "recepcao" | "profissional") {
  if (papel === "dono") return "dono";
  if (papel === "recepcao") return "recepção";
  return "profissional";
}
