import { supabase } from "./supabase";

// Espelha o "papel" gravado na tabela perfil (ver supabase/schema.sql).
export type Papel = "dono" | "recepcao" | "profissional";

export type Perfil = {
  id: string;
  tenant_id: string;
  profissional_id: string | null;
  papel: Papel;
};

// Busca o perfil (papel/cadeira) da pessoa logada. Retorna null se ainda
// não tiver perfil — acontece logo após criar a conta, antes do dono
// vincular a pessoa a um papel.
export async function buscarMeuPerfil(): Promise<Perfil | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfil")
    .select("id, tenant_id, profissional_id, papel")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Roda uma vez, logo depois do cadastro: cria o registro "pendente" em
// perfil (papel='profissional', sem cadeira) — o dono vincula depois.
export async function criarPerfilPendente(tenantId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Ninguém logado.");

  const { error } = await supabase.from("perfil").insert({
    id: user.id,
    tenant_id: tenantId,
    papel: "profissional",
    profissional_id: null,
  });

  if (error) throw error;
}
