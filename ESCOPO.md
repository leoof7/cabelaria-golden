# ESCOPO — Cabelaria Golden

## Cliente

Cabelaria Golden — barbearia/salão, marca "UNISEX & INFANTIL".
Dono: Leo. Instagram @cabelariagolden. Domínio cabelariagolden.com.br.

Hoje usa Salon Soft
(`agendeonline.salonsoft.com.br/cabelariagolden`) e um robô de menu no
WhatsApp. A lista de espera é feita no papel — é o primeiro problema que
este sistema resolve.

## Profissionais

2 cadeiras hoje. No Salon Soft aparecem sem nome, como "Equipe 1" e
"Equipe 2" — usar esses nomes até o Leo passar os reais (ver
`PENDENCIAS.md`). O sistema precisa aceitar uma terceira cadeira sem mexer
em código (cadastro, não constante fixa).

## Dentro do escopo v1

- Profissionais
- Serviços
- Clientes
- Agenda do dia em colunas por profissional
- Novo agendamento
- Fechar atendimento com forma de pagamento
- Caixa (entradas e saídas)
- Fechamento do dia
- Fila de espera ao vivo por profissional
- Página pública de agendamento

## Comissão

Último passo a construir (item 9 da ordem abaixo). Mas todo atendimento
fechado já grava, desde o início: profissional, serviço, valor cobrado,
valor pago, forma de pagamento e data. Com isso, qualquer regra de comissão
vira só um cálculo em cima do que já existe — sem refazer nada.

## Grade de horários e agenda

- Horário padrão do salão: **09:00 às 20:30**, mas cada profissional tem seu
  próprio horário — configurável na tela de profissional (não é constante
  fixa do sistema). Extraído do sistema atual: ele abre 09:00 e atende até
  pelo menos 20:15.
- A grade de horários oferecidos é sempre de **15 em 15 minutos** (:00, :15,
  :30, :45), fixo.
- A duração do serviço **não muda o passo da grade** — ela serve só para (a)
  bloquear a cadeira pelo tempo necessário e (b) impedir que um serviço
  longo seja oferecido num vão de tempo curto demais para ele.

## Página pública de agendamento — diferenciais em relação ao sistema atual

1. Horários agrupados por período (**Manhã / Tarde / Noite**), não uma pilha
   única de botões.
2. Quando não houver horário livre para o serviço escolhido num dia, mostrar
   o botão **"entrar na fila de espera"** no lugar do vazio — hoje o
   sistema dele só mostra tela vazia e o cliente desiste.
- Mostrar preço ou não na página pública: pendente, ver `PENDENCIAS.md`.

## Login e permissões

- Cada profissional cria a própria conta (e-mail/senha) pela tela de login
  do app. Isso funciona sem precisar de servidor, então continua compatível
  com a Fase 1 (GitHub Pages).
- Conta nova nasce **pendente**: só existe login, sem cadeira e sem papel
  definido. O dono vincula essa conta a uma cadeira (ou marca como dono)
  numa tela de usuários.
- **Dono** ("gestão"): vê e mexe em tudo — agenda de todos, caixa,
  fechamento do dia, comissão.
- **Recepção** (pedido pelo Leo): vê e mexe na agenda e na fila de **todos**
  os profissionais — pode marcar/organizar horário de qualquer cadeira.
  **Não tem acesso a caixa nem a atendimento** (financeiro).
- **Profissional**: vê e mexe só na própria agenda, fila e atendimentos.
  **Não vê o caixa nem o fechamento financeiro do salão** — só registra o
  próprio atendimento (valor cobrado/pago daquele cliente).
- O primeiro dono (o Leo) precisa ser promovido manualmente, uma vez só, no
  painel do Supabase, depois que ele criar a própria conta — ver
  `PENDENCIAS.md`.
- Regra de segurança e as permissões linha a linha (RLS) estão comentadas
  em `supabase/schema.sql`.

## Mensagens prontas (WhatsApp)

- Existe uma tela (dono) para editar textos prontos — ex: "confirmação de
  horário", "chegou sua vez". Guardados na tabela `modelo_mensagem`.
- O envio continua **manual**: um botão no app monta um link do WhatsApp
  (`wa.me`) já com o número do cliente e o texto preenchido. A pessoa só
  confere e aperta enviar — funciona igual no computador e no celular, abre
  o WhatsApp instalado.
- Isso não é integração automática (API paga da Meta) — é só um atalho para
  não digitar a mensagem toda vez. `mensagem_enviada` conta quantas vezes
  esse atalho foi usado, pensando numa integração automática futura.

## Fora do escopo

Estoque, fornecedores, fiado, pacotes, nota fiscal, lanchonete,
currículo/curso, app nativo, ficha técnica, aniversariantes. Se o Leo pedir
algo dessa lista, lembrar que está fora e perguntar se é mudança de escopo
antes de construir.

## Ordem de construção

1. Listas base (profissional, serviço, cliente)
2. Agenda do dia
3. Novo agendamento
4. Fechar atendimento
5. Caixa
6. Fechamento do dia
7. Fila de espera
8. Página pública
9. Comissão

Status atual: **item 1 concluído** (listas base) — login individual, tela
de acessos da equipe (dono vincula login a papel/cadeira), profissionais,
serviços e clientes. Repositório publicado em
https://github.com/leoof7/cabelaria-golden. Ainda não testado com banco de
dados real (falta o projeto Supabase — ver `PENDENCIAS.md`). Em andamento:
**item 2, agenda do dia**.

## Serviços reais (extraídos do Salon Soft do cliente)

As durações abaixo são as que o Salon Soft usa hoje — várias estão erradas
(marcadas). Os preços não aparecem no sistema dele: os valores abaixo são
referência de mercado, editáveis na tela de serviços.

| Serviço | Duração atual | Preço ref. | Observação |
|---|---|---|---|
| Corte | 30min | R$ 45 | |
| Corte na Máquina | 15min | R$ 30 | |
| Pezinho | 5min | R$ 15 | duração suspeita |
| Manutenção | 30min | R$ 35 | duplicado no sistema dele |
| Barba Comum | 20min | R$ 30 | |
| Barba / Sombra | 20min | R$ 35 | |
| Barba Toalha Quente | 20min | R$ 40 | |
| Barboterapia | 20min | R$ 50 | |
| Sobrancelha | 5min | R$ 15 | duração suspeita |
| Corte e barba | 1h | R$ 70 | |
| Corte e sobrancelha | 40min | R$ 55 | |
| Corte barba e sobrancelha | 1h | R$ 85 | |
| Corte e Barboterapia | 1h | R$ 90 | |
| Botox hidratante | 20min | R$ 60 | duração suspeita |
| Hidratação | 5min | R$ 40 | duração muito suspeita |
| Luzes | 20min | R$ 120 | duração muito suspeita |
| Platinado | 30min | R$ 150 | duração muito suspeita |
| Selagem ou Progressiva | 30min | R$ 120 | duração muito suspeita |
| Pigmentação no Cabelo ou Barba | 20min | R$ 45 | |

No sistema do Leo, "Corte" está cadastrado 4x idêntico e "Manutenção" 3x com
durações diferentes. Aqui cada um foi cadastrado uma vez só. Se depois ele
disser que são variações por profissional ou por preço, desdobramos.

## Regras técnicas

Ver `CLAUDE.md` — stack, hospedagem em duas fases, regras de banco
(`tenant_id`, RLS, centavos, fuso horário) e segurança.

Desenvolvimento roda na máquina do Leo. A cada versão nova, o comando para
abrir no celular pela rede wi-fi vai junto com o aviso.

## ADRs (decisões de arquitetura)

### ADR-001 — Fundação do projeto (2026-09-08)

- Next.js App Router + TypeScript + Tailwind, `output: 'export'` para a
  Fase 1 (GitHub Pages), `basePath` configurado a partir do nome do
  repositório.
- Supabase acessado só pelo navegador (chave `anon`), sem rotas de API, sem
  server actions, sem middleware — exigência da hospedagem estática.
- Todas as tabelas nascem com `tenant_id`, RLS ligado, mesmo com um único
  tenant hoje — evita reescrever quando houver mais de um cliente.
- Serviços duplicados no sistema atual do Leo ("Corte" 4x, "Manutenção" 3x)
  foram consolidados em um registro único cada, com nota em
  `PENDENCIAS.md` para confirmar se há variações reais por trás disso.

### ADR-002 — Login individual e mensagens prontas (2026-09-08)

- Decisão do Leandro: profissionais têm login individual, com o dono vendo
  tudo (inclusive caixa/comissão de todos) e cada profissional vendo só a
  própria agenda/fila/atendimento, sem acesso ao caixa do salão.
- Implementado com Supabase Auth (e-mail/senha), 100% client-side — nenhuma
  rota de servidor precisou ser criada, então a Fase 1 (GitHub Pages)
  continua de pé.
- Cadastro de conta nova fica "pendente" até o dono vincular a uma cadeira
  — evita que qualquer pessoa que descubra a URL do sistema vire dono ou
  "role" como profissional de mentira.
- Mensagens prontas (tabela `modelo_mensagem`) + botão que abre o WhatsApp
  com o texto preenchido (link `wa.me`), sem integração paga. Funciona
  igual em navegador de computador e de celular.

### ADR-003 — Terceiro papel de acesso: recepção (2026-09-09)

- Pedido direto do Leo (print de conversa no WhatsApp): além de dono e
  profissional, precisa de um acesso de **recepção** — vê a agenda de
  todos os profissionais para organizar horário de qualquer cadeira, mas
  sem acesso a financeiro (caixa, atendimento).
- Implementado em `supabase/schema.sql`: `perfil.papel` agora aceita
  `'dono' | 'recepcao' | 'profissional'`, com função auxiliar
  `eh_recepcao()` e policies de `agendamento`/`fila` liberando leitura e
  escrita para esse papel, mantendo `atendimento`/`lancamento` fechados
  para ele.
