"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { criarPerfilPendente } from "@/lib/perfil";
import { TENANT_ID } from "@/lib/constantes";
import { useAuth } from "@/lib/auth-provider";

type Modo = "entrar" | "criar-conta";

export default function PaginaLogin() {
  const router = useRouter();
  const { recarregarPerfil } = useAuth();

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) throw error;

        // Se o e-mail já precisar de confirmação, ainda não existe sessão
        // aqui — o perfil pendente é criado depois, no primeiro login.
        if (data.session) {
          await criarPerfilPendente(TENANT_ID);
        }
      }

      await recarregarPerfil();
      router.push("/");
    } catch (e) {
      setErro(traduzErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="titulo-marca text-center text-2xl text-dourado">
          Cabelaria Golden
        </h1>
        <div className="divisoria-metalica mx-auto my-4 w-24" />

        <div className="mb-6 flex rounded-lg bg-cartao p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setModo("entrar")}
            className={`flex-1 rounded-md py-2 transition-colors ${
              modo === "entrar"
                ? "bg-dourado text-fundo"
                : "text-texto-secundario"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setModo("criar-conta")}
            className={`flex-1 rounded-md py-2 transition-colors ${
              modo === "criar-conta"
                ? "bg-dourado text-fundo"
                : "text-texto-secundario"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={aoSubmeter} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-texto-secundario">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-texto-secundario">
            Senha
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
            />
          </label>

          {erro && (
            <p className="rounded-lg bg-alerta/15 px-4 py-3 text-sm text-alerta">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-dourado py-3 text-base font-bold text-fundo transition-opacity disabled:opacity-60"
          >
            {carregando
              ? "Um instante..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar minha conta"}
          </button>

          {modo === "criar-conta" && (
            <p className="text-center text-xs text-texto-secundario">
              Depois de criar a conta, peça para o dono liberar seu acesso.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function traduzErro(e: unknown): string {
  const mensagem = e instanceof Error ? e.message : String(e);

  if (mensagem.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (mensagem.includes("User already registered")) {
    return "Já existe conta com esse e-mail — tenta entrar em vez de criar.";
  }
  if (mensagem.includes("Password should be at least")) {
    return "A senha precisa ter pelo menos 6 letras/números.";
  }
  return "Não deu certo. Confere o e-mail e a senha e tenta de novo.";
}
