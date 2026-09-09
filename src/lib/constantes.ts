// Mesmo UUID fixo usado em supabase/schema.sql (função tenant_padrao_id()).
// Não é segredo — é só o identificador do único salão que existe hoje.
// Se um dia existir mais de um tenant, isso deixa de ser uma constante fixa.
export const TENANT_ID = "11111111-1111-1111-1111-111111111111";
