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

Status atual: **itens 1 a 8 construídos** — login individual, acessos da
equipe, profissionais, serviços, clientes, agenda do dia, novo agendamento,
fechar atendimento, caixa, fechamento do dia, fila de espera e a página
pública de agendamento (`/agendar`, sem login, com horários por período e
botão de fila quando não há vaga). Repositório publicado em
https://github.com/leoof7/cabelaria-golden. Ainda **não testado com banco
de dados real** (falta o projeto Supabase — ver `PENDENCIAS.md`).

**Item 9 (comissão) propositalmente não iniciado**: depende da regra que o
Leo ainda não passou (percentual? aluguel de cadeira? — ver
`PENDENCIAS.md`). Diferente das outras pendências, essa mexe direto no
dinheiro que cada profissional recebe, então não é o tipo de coisa pra
chutar um padrão e seguir — vale esperar a resposta dele antes de
construir.

### ADR-005 — Revisão de bugs antes do banco entrar (2026-09-09)

Passada uma revisão linha a linha em todo o código (sem banco real pra
testar de ponta a ponta, então essa foi a forma de garantir qualidade
possível nesse momento). Achados e corrigidos:

- **RLS**: desativar um profissional/serviço/modelo de mensagem fazia ele
  sumir até da tela de gerenciar (RLS só liberava ver quem estava ativo,
  pra todo mundo). Corrigido: quem está logado vê tudo, ativo ou não;
  anônimo (página pública) continua só vendo ativo.
- **Fechamento do dia**: nome do profissional nunca aparecia (o campo do
  banco tinha um nome e o código lia outro).
- **Permissão silenciosa**: um profissional conseguia tentar fechar
  atendimento de colega ou marcar horário na agenda de colega, e só
  descobria que não podia num erro feio na hora de salvar. Agora nem
  aparece a opção pra quem não pode.
- **Grade de horário**: se o horário de abertura de alguém não fosse
  múltiplo de 15 (ex: "09:10"), a grade toda saía do :00/:15/:30/:45.
  Corrigido pra sempre arredondar pra cima.
- **Duplicidade de cliente**: telefone digitado rápido demais (antes da
  busca achar) podia tentar criar cliente duplicado e travar com erro.
  Trocado por "achar ou criar" (upsert) nas telas internas.
- **Fuso horário**: a página pública calculava "já passou da hora" com o
  relógio do aparelho de quem acessa, não o de São Paulo.
- Um `data` de volta pra tela errada depois de fechar atendimento — agora
  volta pro dia que a pessoa estava vendo, não sempre "hoje".

### Mensagens prontas — construído (2026-09-09)

Tela `/mensagens` (dono edita os textos) + botão de WhatsApp em dois
lugares onde faz sentido: depois de criar um agendamento (manda
confirmação) e na fila de espera (avisa que chegou a vez). Sempre manual —
a pessoa confere e aperta enviar dentro do próprio WhatsApp.

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

### ADR-004 — Função para cliente se cadastrar sozinho na página pública (2026-09-09)

- Problema: quem acessa a página pública de agendamento não está logado,
  então (por privacidade) não pode enxergar a tabela de clientes — mas
  também não pode criar um cadastro novo a cada visita, senão vira cliente
  duplicado toda vez.
- Solução: função no banco (`cliente_upsert_publico`) que roda com
  privilégio elevado só para achar-ou-criar o cliente pelo telefone, e
  devolve apenas o id — nada mais da tabela fica visível pra quem não está
  logado. Ver `supabase/schema.sql`.

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
