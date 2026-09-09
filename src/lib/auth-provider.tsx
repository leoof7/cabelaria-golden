"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { buscarMeuPerfil, type Perfil } from "./perfil";

type AuthContextValue = {
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  recarregarPerfil: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  async function recarregarPerfil() {
    const p = await buscarMeuPerfil();
    setPerfil(p);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      if (data.session) await recarregarPerfil();
      setCarregando(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange(
      async (_evento, novaSessao) => {
        setSessao(novaSessao);
        if (novaSessao) {
          await recarregarPerfil();
        } else {
          setPerfil(null);
        }
      },
    );

    return () => assinatura.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ carregando, sessao, perfil, recarregarPerfil }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return contexto;
}
