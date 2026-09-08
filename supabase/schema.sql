-- ============================================================================
-- Cabelaria Golden — schema do banco (Supabase / Postgres)
-- ============================================================================
-- Convenções deste projeto (ver CLAUDE.md):
--   - tenant_id em toda tabela, mesmo com um único cliente hoje
--   - RLS ligado e FORÇADO em toda tabela
--   - dinheiro sempre em centavos (inteiro, nunca decimal)
--   - fuso America/Sao_Paulo em toda fronteira de dia
--   - nomes de tabela/coluna em português, sem acento, minúsculo com "_"
--
-- Banco de UM tenant só por enquanto. Em vez de repetir um UUID fixo em
-- cada policy, a função tenant_padrao_id() centraliza esse valor — se um
-- dia existir mais de um cliente, essa função (e só ela) muda.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TENANT
-- ----------------------------------------------------------------------------

create table public.tenant (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  criado_em  timestamptz not null default now()
);

create or replace function public.tenant_padrao_id()
returns uuid
language sql
immutable
as $$
  select '11111111-1111-1111-1111-111111111111'::uuid
$$;

insert into public.tenant (id, nome)
values (public.tenant_padrao_id(), 'Cabelaria Golden');

-- ----------------------------------------------------------------------------
-- 2. PROFISSIONAL
-- ----------------------------------------------------------------------------
-- Hoje são 2 cadeiras ("Equipe 1", "Equipe 2" — nomes reais pendentes, ver
-- PENDENCIAS.md). Uma terceira cadeira entra como uma linha nova aqui,
-- nunca como mudança de código. Cada profissional tem seu próprio horário
-- de trabalho, não o horário geral do salão.

create table public.profissional (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenant (id),
  nome                 text not null,
  ativo                boolean not null default true,
  horario_abertura     time not null default '09:00',
  horario_fechamento   time not null default '20:30',
  criado_em            timestamptz not null default now()
);

insert into public.profissional (tenant_id, nome) values
  (public.tenant_padrao_id(), 'Equipe 1'),
  (public.tenant_padrao_id(), 'Equipe 2');

-- ----------------------------------------------------------------------------
-- 3. PERFIL — liga um login (auth.users) a um tenant, um papel e,
--    se for profissional, à cadeira que ele ocupa.
-- ----------------------------------------------------------------------------
--
-- Como funciona o cadastro (sem precisar de servidor nem de chave secreta):
--   1. A pessoa cria a própria conta (e-mail/senha) pela tela de login do
--      app — isso já cria uma linha em auth.users, gerenciado pelo Supabase.
--   2. O app cria a linha correspondente aqui com papel='profissional' e
--      profissional_id em branco (NULL) — fica "pendente".
--   3. O dono abre a tela de usuários e vincula essa conta a uma cadeira
--      (Equipe 1, Equipe 2...) ou marca como dono. Só o dono pode fazer isso.
--
-- O primeiro dono (o Leo) precisa ser promovido manualmente uma única vez,
-- direto no painel do Supabase, depois que ele criar a própria conta — está
-- anotado em PENDENCIAS.md para não esquecer.

create table public.perfil (
  id               uuid primary key references auth.users (id) on delete cascade,
  tenant_id        uuid not null references public.tenant (id),
  profissional_id  uuid references public.profissional (id),
  papel            text not null default 'profissional'
                     check (papel in ('dono', 'profissional')),
  criado_em        timestamptz not null default now(),

  constraint dono_sem_cadeira
    check (papel <> 'dono' or profissional_id is null)
);

-- Funções auxiliares para as policies de RLS das outras tabelas.
-- SECURITY DEFINER: rodam "por cima" do RLS da própria tabela perfil, senão
-- toda policy que precisasse ler o papel do usuário cairia em loop.

create or replace function public.meu_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.perfil where id = auth.uid()
$$;

create or replace function public.meu_profissional_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profissional_id from public.perfil where id = auth.uid()
$$;

create or replace function public.eh_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfil where id = auth.uid() and papel = 'dono'
  )
$$;

-- ----------------------------------------------------------------------------
-- 4. SERVICO
-- ----------------------------------------------------------------------------
-- Duração e preço abaixo são os dados reais extraídos do sistema atual do
-- cliente (Salon Soft) — várias durações estão marcadas como suspeitas e os
-- preços são referência de mercado. Tudo editável na tela de serviços.
-- Ver ESCOPO.md e PENDENCIAS.md para o detalhe de cada um.

create table public.servico (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenant (id),
  nome              text not null,
  duracao_minutos   integer not null check (duracao_minutos > 0),
  preco_centavos    integer not null check (preco_centavos >= 0),
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);

insert into public.servico (tenant_id, nome, duracao_minutos, preco_centavos) values
  (public.tenant_padrao_id(), 'Corte', 30, 4500),
  (public.tenant_padrao_id(), 'Corte na Máquina', 15, 3000),
  (public.tenant_padrao_id(), 'Pezinho', 5, 1500),
  (public.tenant_padrao_id(), 'Manutenção', 30, 3500),
  (public.tenant_padrao_id(), 'Barba Comum', 20, 3000),
  (public.tenant_padrao_id(), 'Barba / Sombra', 20, 3500),
  (public.tenant_padrao_id(), 'Barba Toalha Quente', 20, 4000),
  (public.tenant_padrao_id(), 'Barboterapia', 20, 5000),
  (public.tenant_padrao_id(), 'Sobrancelha', 5, 1500),
  (public.tenant_padrao_id(), 'Corte e barba', 60, 7000),
  (public.tenant_padrao_id(), 'Corte e sobrancelha', 40, 5500),
  (public.tenant_padrao_id(), 'Corte barba e sobrancelha', 60, 8500),
  (public.tenant_padrao_id(), 'Corte e Barboterapia', 60, 9000),
  (public.tenant_padrao_id(), 'Botox hidratante', 20, 6000),
  (public.tenant_padrao_id(), 'Hidratação', 5, 4000),
  (public.tenant_padrao_id(), 'Luzes', 20, 12000),
  (public.tenant_padrao_id(), 'Platinado', 30, 15000),
  (public.tenant_padrao_id(), 'Selagem ou Progressiva', 30, 12000),
  (public.tenant_padrao_id(), 'Pigmentação no Cabelo ou Barba', 20, 4500);

-- ----------------------------------------------------------------------------
-- 5. CLIENTE
-- ----------------------------------------------------------------------------
-- telefone é único por tenant: é como o app reconhece "já é cliente" tanto
-- na tela interna quanto na página pública (sem exigir login do cliente).

create table public.cliente (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant (id),
  nome       text not null,
  telefone   text not null,
  criado_em  timestamptz not null default now(),

  constraint cliente_telefone_unico unique (tenant_id, telefone)
);

-- ----------------------------------------------------------------------------
-- 6. AGENDAMENTO
-- ----------------------------------------------------------------------------
-- duracao_minutos aqui é uma FOTO da duração do serviço no momento em que
-- foi agendado — se o serviço mudar de duração depois, agendamentos já
-- marcados não mudam de tamanho na agenda. data_hora_fim é calculada a
-- partir disso, nunca digitada.

create table public.agendamento (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenant (id),
  profissional_id    uuid not null references public.profissional (id),
  servico_id         uuid not null references public.servico (id),
  cliente_id         uuid not null references public.cliente (id),
  duracao_minutos    integer not null check (duracao_minutos > 0),
  data_hora_inicio   timestamptz not null,
  data_hora_fim      timestamptz generated always as
                       (data_hora_inicio + (duracao_minutos || ' minutes')::interval) stored,
  status             text not null default 'agendado'
                       check (status in ('agendado', 'concluido', 'cancelado', 'faltou')),
  origem             text not null default 'interno'
                       check (origem in ('interno', 'publico')),
  criado_em          timestamptz not null default now()
);

create index agendamento_profissional_horario_idx
  on public.agendamento (profissional_id, data_hora_inicio);

-- ----------------------------------------------------------------------------
-- 7. ATENDIMENTO — o fechamento em si. Grava tudo que uma regra de
--    comissão vai precisar no futuro, sem precisar refazer nada.
-- ----------------------------------------------------------------------------
-- valor_cobrado x valor_pago existem para representar DESCONTO (ex: cobrou
-- 45, deu desconto, recebeu 40). Isso não é fiado — fiado está fora do
-- escopo v1 e não existe conceito de "saldo devedor" neste sistema.

create table public.atendimento (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenant (id),
  agendamento_id         uuid references public.agendamento (id),
  profissional_id        uuid not null references public.profissional (id),
  servico_id             uuid not null references public.servico (id),
  cliente_id             uuid references public.cliente (id),
  valor_cobrado_centavos integer not null check (valor_cobrado_centavos >= 0),
  valor_pago_centavos    integer not null check (valor_pago_centavos >= 0),
  forma_pagamento        text not null
                           check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')),
  data                   timestamptz not null default now(),
  criado_em              timestamptz not null default now()
);

create index atendimento_profissional_data_idx
  on public.atendimento (profissional_id, data);

-- ----------------------------------------------------------------------------
-- 8. LANCAMENTO — caixa (entradas e saídas)
-- ----------------------------------------------------------------------------
-- Fechar um atendimento pago cria uma entrada aqui automaticamente (feito
-- pelo app, não por trigger de banco, para manter a regra visível no
-- código da tela de fechar atendimento).

create table public.lancamento (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant (id),
  tipo             text not null check (tipo in ('entrada', 'saida')),
  valor_centavos   integer not null check (valor_centavos > 0),
  descricao        text not null,
  atendimento_id   uuid references public.atendimento (id),
  data             timestamptz not null default now(),
  criado_em        timestamptz not null default now()
);

create index lancamento_data_idx on public.lancamento (data);

-- ----------------------------------------------------------------------------
-- 9. FILA — fila de espera ao vivo, por profissional
-- ----------------------------------------------------------------------------

create table public.fila (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenant (id),
  profissional_id  uuid references public.profissional (id),
  cliente_id       uuid not null references public.cliente (id),
  servico_id       uuid references public.servico (id),
  status           text not null default 'esperando'
                     check (status in ('esperando', 'chamado', 'atendido', 'desistiu')),
  entrou_em        timestamptz not null default now(),
  criado_em        timestamptz not null default now()
);

create index fila_profissional_status_idx
  on public.fila (profissional_id, status);

-- ----------------------------------------------------------------------------
-- 10. MODELO_MENSAGEM — textos prontos para os botões de WhatsApp
-- ----------------------------------------------------------------------------
-- O envio em si é manual: o app monta um link "wa.me" com o número do
-- cliente e o texto já preenchido (com {{cliente}}, {{horario}} etc.
-- trocados pelos dados reais), a pessoa só confere e aperta enviar dentro
-- do próprio WhatsApp. Não existe integração paga aqui — é só um atalho.

create table public.modelo_mensagem (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenant (id),
  titulo     text not null,
  texto      text not null,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

insert into public.modelo_mensagem (tenant_id, titulo, texto) values
  (public.tenant_padrao_id(), 'Confirmação de horário',
   'Olá {{cliente}}! Seu horário na Cabelaria Golden está confirmado para {{horario}} com {{profissional}}. Até lá!'),
  (public.tenant_padrao_id(), 'Chegou a vez (fila)',
   'Oi {{cliente}}, chegou sua vez! Pode vir para a cadeira do(a) {{profissional}}.'),
  (public.tenant_padrao_id(), 'Lembrete de horário',
   'Oi {{cliente}}, passando para lembrar do seu horário hoje às {{horario}} na Cabelaria Golden.');

-- ----------------------------------------------------------------------------
-- 11. MENSAGEM_ENVIADA — contador, mesmo sem WhatsApp automático ainda
-- ----------------------------------------------------------------------------
-- Existe desde já para não virar conta surpresa da Meta no dia em que a
-- integração automática entrar. Por enquanto, cada clique no botão de
-- WhatsApp pode gravar uma linha aqui como registro do que foi mandado.

create table public.mensagem_enviada (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenant (id),
  canal                 text not null default 'whatsapp' check (canal in ('whatsapp')),
  modelo_mensagem_id    uuid references public.modelo_mensagem (id),
  destinatario_telefone text not null,
  enviado_em            timestamptz not null default now(),
  criado_em             timestamptz not null default now()
);

-- ============================================================================
-- RLS — ligado e FORÇADO em toda tabela, sem exceção
-- ============================================================================
-- Quem pode o quê, resumido:
--   anon (visitante da página pública, sem login):
--     - vê profissionais e serviços ativos
--     - cria/atualiza o próprio cadastro de cliente (nome/telefone)
--     - cria agendamento e entrada na fila
--     - vê agendamentos futuros só para calcular horário livre
--     - NUNCA vê caixa, atendimento (valores) ou lista de clientes
--   profissional (logado):
--     - vê e mexe na própria agenda, fila e atendimentos
--     - NÃO vê o caixa (lancamento) nem atendimento de outro profissional
--   dono (logado):
--     - vê e mexe em tudo dentro do próprio tenant

alter table public.tenant            enable row level security;
alter table public.tenant            force row level security;
alter table public.profissional      enable row level security;
alter table public.profissional      force row level security;
alter table public.perfil            enable row level security;
alter table public.perfil            force row level security;
alter table public.servico           enable row level security;
alter table public.servico           force row level security;
alter table public.cliente           enable row level security;
alter table public.cliente           force row level security;
alter table public.agendamento       enable row level security;
alter table public.agendamento       force row level security;
alter table public.atendimento       enable row level security;
alter table public.atendimento       force row level security;
alter table public.lancamento        enable row level security;
alter table public.lancamento        force row level security;
alter table public.fila              enable row level security;
alter table public.fila              force row level security;
alter table public.modelo_mensagem   enable row level security;
alter table public.modelo_mensagem   force row level security;
alter table public.mensagem_enviada  enable row level security;
alter table public.mensagem_enviada  force row level security;

-- --- tenant -------------------------------------------------------------

create policy "tenant_select_publico" on public.tenant
  for select to anon, authenticated
  using (id = public.tenant_padrao_id());

create policy "tenant_update_dono" on public.tenant
  for update to authenticated
  using (id = public.meu_tenant_id() and public.eh_dono());

-- --- profissional ---------------------------------------------------------

create policy "profissional_select_publico" on public.profissional
  for select to anon, authenticated
  using (ativo = true and tenant_id = public.tenant_padrao_id());

create policy "profissional_escreve_dono" on public.profissional
  for insert to authenticated
  with check (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "profissional_atualiza_dono" on public.profissional
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "profissional_apaga_dono" on public.profissional
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- perfil -----------------------------------------------------------

create policy "perfil_select_proprio_ou_dono" on public.perfil
  for select to authenticated
  using (id = auth.uid() or (tenant_id = public.meu_tenant_id() and public.eh_dono()));

-- a própria pessoa só consegue criar o registro inicial "pendente"
-- (profissional, sem cadeira) — nunca já nascer dono nem já vinculada.
create policy "perfil_insere_proprio_pendente" on public.perfil
  for insert to authenticated
  with check (
    id = auth.uid()
    and tenant_id = public.tenant_padrao_id()
    and papel = 'profissional'
    and profissional_id is null
  );

create policy "perfil_atualiza_dono" on public.perfil
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- servico ----------------------------------------------------------

create policy "servico_select_publico" on public.servico
  for select to anon, authenticated
  using (ativo = true and tenant_id = public.tenant_padrao_id());

create policy "servico_escreve_dono" on public.servico
  for insert to authenticated
  with check (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "servico_atualiza_dono" on public.servico
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "servico_apaga_dono" on public.servico
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- cliente ------------------------------------------------------------
-- anon não LÊ a lista de clientes (privacidade) — só cria/atualiza o
-- próprio cadastro via telefone, para o fluxo de agendamento público.

create policy "cliente_select_equipe" on public.cliente
  for select to authenticated
  using (tenant_id = public.meu_tenant_id());

create policy "cliente_insere_publico_e_equipe" on public.cliente
  for insert to anon, authenticated
  with check (tenant_id = public.tenant_padrao_id());

create policy "cliente_atualiza_publico_e_equipe" on public.cliente
  for update to anon, authenticated
  using (tenant_id = public.tenant_padrao_id());

create policy "cliente_apaga_dono" on public.cliente
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- agendamento --------------------------------------------------------

create policy "agendamento_select_publico_futuro" on public.agendamento
  for select to anon
  using (
    tenant_id = public.tenant_padrao_id()
    and status = 'agendado'
    and data_hora_inicio > now()
  );

create policy "agendamento_select_equipe" on public.agendamento
  for select to authenticated
  using (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id())
  );

create policy "agendamento_insere_publico" on public.agendamento
  for insert to anon
  with check (
    tenant_id = public.tenant_padrao_id()
    and origem = 'publico'
    and status = 'agendado'
  );

create policy "agendamento_insere_equipe" on public.agendamento
  for insert to authenticated
  with check (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id())
  );

create policy "agendamento_atualiza_equipe" on public.agendamento
  for update to authenticated
  using (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id())
  );

create policy "agendamento_apaga_dono" on public.agendamento
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- atendimento --------------------------------------------------------
-- financeiro do próprio profissional: ele grava e vê o que ele mesmo
-- fechou, mas não enxerga o fechamento dos colegas. Dono vê tudo.

create policy "atendimento_select_equipe" on public.atendimento
  for select to authenticated
  using (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id())
  );

create policy "atendimento_insere_equipe" on public.atendimento
  for insert to authenticated
  with check (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id())
  );

create policy "atendimento_atualiza_dono" on public.atendimento
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "atendimento_apaga_dono" on public.atendimento
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- lancamento (caixa) ---------------------------------------------------
-- só o dono lê o caixa. Um profissional pode GERAR uma entrada ao fechar o
-- próprio atendimento (insert), mas não consegue listar/ver o lançamento
-- depois de criado — isso é o que garante que ele "não vê o caixa".

create policy "lancamento_select_dono" on public.lancamento
  for select to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "lancamento_insere_equipe" on public.lancamento
  for insert to authenticated
  with check (
    tenant_id = public.meu_tenant_id()
    and (
      public.eh_dono()
      or (
        tipo = 'entrada'
        and atendimento_id in (
          select id from public.atendimento
          where profissional_id = public.meu_profissional_id()
        )
      )
    )
  );

create policy "lancamento_atualiza_dono" on public.lancamento
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "lancamento_apaga_dono" on public.lancamento
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- fila -----------------------------------------------------------------

create policy "fila_select_equipe" on public.fila
  for select to authenticated
  using (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id() or profissional_id is null)
  );

create policy "fila_insere_publico" on public.fila
  for insert to anon
  with check (tenant_id = public.tenant_padrao_id() and status = 'esperando');

create policy "fila_insere_equipe" on public.fila
  for insert to authenticated
  with check (tenant_id = public.meu_tenant_id());

create policy "fila_atualiza_equipe" on public.fila
  for update to authenticated
  using (
    tenant_id = public.meu_tenant_id()
    and (public.eh_dono() or profissional_id = public.meu_profissional_id() or profissional_id is null)
  );

create policy "fila_apaga_dono" on public.fila
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- modelo_mensagem --------------------------------------------------

create policy "modelo_mensagem_select_equipe" on public.modelo_mensagem
  for select to authenticated
  using (ativo = true and tenant_id = public.meu_tenant_id());

create policy "modelo_mensagem_escreve_dono" on public.modelo_mensagem
  for insert to authenticated
  with check (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "modelo_mensagem_atualiza_dono" on public.modelo_mensagem
  for update to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "modelo_mensagem_apaga_dono" on public.modelo_mensagem
  for delete to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

-- --- mensagem_enviada -----------------------------------------------------
-- contador de uso — qualquer pessoa da equipe pode registrar que mandou uma
-- mensagem, mas só o dono acompanha o total (é ele quem se preocupa com
-- custo/limite da Meta no futuro).

create policy "mensagem_enviada_select_dono" on public.mensagem_enviada
  for select to authenticated
  using (tenant_id = public.meu_tenant_id() and public.eh_dono());

create policy "mensagem_enviada_insere_equipe" on public.mensagem_enviada
  for insert to authenticated
  with check (tenant_id = public.meu_tenant_id());
