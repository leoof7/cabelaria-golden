import { createClient } from "@supabase/supabase-js";

// Fase 1 (GitHub Pages) não tem servidor, então TODO acesso ao banco
// acontece direto do navegador do usuário. Por isso a chave usada aqui
// tem que ser a "anon" (pública) — nunca a "service_role". Quem protege
// os dados nesse cenário é o RLS (Row Level Security) ligado em cada
// tabela do banco, não o segredo da chave.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Não pode ser um "throw" aqui: como o site é exportado estático (sem
// servidor), o Next roda esse arquivo também durante o build, mesmo que
// nenhuma tela chame o banco de verdade nesse momento. Um throw derrubaria
// o build inteiro. Por isso: aviso no console, e placeholder que só falha
// quando alguém de fato tentar usar o banco pelo navegador.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL e/ou " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY. Copie .env.example para .env.local " +
      "e preencha com os dados do projeto Supabase — sem isso, nada que " +
      "acessa o banco vai funcionar.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);
