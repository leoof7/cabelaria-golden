# CLAUDE.md — Cabelaria Golden

Projeto dentro da Lesete. Vale este arquivo + o `CLAUDE.md` da pasta `LS`
(regras gerais da casa).

## O produto

Sistema de agenda e caixa para a Cabelaria Golden (barbearia/salão,
"UNISEX & INFANTIL"), dono Leo, Instagram @cabelariagolden, domínio
cabelariagolden.com.br. Hoje ele usa Salon Soft + robô de WhatsApp, e a fila
de espera é feita no papel — é isso que este sistema resolve primeiro.

Escopo completo, ordem de construção e tabela de serviços reais estão em
`ESCOPO.md`. Pendências (coisas que dependem de resposta do Leo) estão em
`PENDENCIAS.md`.

## SEGURANÇA — regra que nunca se quebra

Este repositório fica **público no GitHub** durante o desenvolvimento.

1. `.env` e `.env.local` entram no `.gitignore` antes do primeiro commit.
   Nenhuma exceção, nunca.
2. Nenhuma chave, token, senha ou URL de banco escrita direto em código.
   Sempre variável de ambiente.
3. A chave `service_role` do Supabase **nunca** aparece no projeto — nem em
   exemplo, nem em comentário, nem em teste. Só a `anon` (pública).
4. Antes de todo `git push`, conferir se não há segredo no commit. Se
   encontrar, parar e avisar antes de subir.
5. `.env.example` documenta os nomes das variáveis com valores vazios — esse
   sim vai para o Git.
6. Se em algum momento o Leo pedir para commitar algo com segredo, recusar e
   explicar por quê.

## Stack (fechada, não mudar sem justificar)

TypeScript, Next.js (App Router), Supabase, Tailwind. Nenhuma biblioteca nova
entra sem uma frase explicando por que o projeto não fica de pé sem ela.

## Hospedagem — duas fases

- **Fase 1 (agora):** GitHub Pages, só para o Leo acompanhar. Next.js com
  `output: 'export'` e `basePath` do repositório. Acesso ao Supabase direto
  do navegador, com chave pública e RLS. **Proibido usar rotas de API,
  server actions ou middleware** — nada disso funciona em site estático. Se
  algo for indispensável, parar e avisar antes de construir.
- **Fase 2 (produção):** Vercel. Não configurar nada de Vercel agora.

## Banco de dados

Um projeto Supabase só, dados descartáveis até a produção (aí limpamos e
recomeçamos com dado real).

- `tenant_id` em toda tabela, mesmo com um cliente só
- RLS ligado e forçado em todas as tabelas
- Dinheiro em centavos, inteiro, nunca decimal
- Fuso `America/Sao_Paulo` em toda fronteira de dia
- Nomes de tabela e coluna em português, sem acento, minúsculo com underline
- Toda tabela tem `criado_em`

Tabelas: `tenant`, `profissional`, `perfil` (login/papel de cada pessoa),
`servico`, `cliente`, `agendamento`, `atendimento`, `lancamento`
(entrada|saida), `fila`, `modelo_mensagem` (textos prontos p/ WhatsApp),
`mensagem_enviada`.

## Login e permissões

Login individual (Supabase Auth, e-mail/senha, client-side — compatível com
a Fase 1 sem servidor). Três papéis, pedidos pelo próprio Leo:

- **Dono**: vê e mexe em tudo, inclusive caixa.
- **Recepção**: vê e mexe na agenda e fila de **todos** os profissionais,
  mas **nunca** vê caixa nem atendimento (financeiro).
- **Profissional**: vê e mexe só na própria agenda/fila/atendimento —
  **nunca** vê o caixa nem o financeiro de ninguém.

Detalhe de como a conta nasce "pendente" até o dono vincular a uma cadeira
ou papel: ver `ESCOPO.md` (seção "Login e permissões") e os comentários em
`supabase/schema.sql`.

## Forma de trabalhar

- Uma tarefa por vez. Termina, mostra, só então segue.
- Plano antes de código, em português, dizendo o que vai mexer e o que pode
  quebrar.
- Decisão técnica: decide e explica por quê. Decisão de produto/negócio:
  pergunta ao Leo.
- Se algo depende de resposta que ainda não tem: escolhe um padrão razoável,
  deixa editável na tela, anota em `PENDENCIAS.md`. Nunca para esperando.
- Nunca faz deploy sem pedido explícito.
- Nunca `git push --force`, nunca reescreve histórico, nunca apaga dado sem
  avisar antes em letras claras e esperar resposta.
- Commits em português, uma frase, dizendo o que mudou para o negócio.

## Visual — cores da marca

Fundo quase preto, dourado como acento (não banho — a maior parte da tela é
escura com texto creme), coroa branca.

```
Fundo principal      #0B0B0B
Cartões e blocos     #151515
Dourado principal    #C9A227
Dourado claro        #E8D493
Dourado escuro       #6E5A28
Champanhe            #F2E6B8
Texto principal      #F4F1E8
Texto secundário     #8C8779
Entrada de dinheiro  #5FA772
Alerta               #C25B3A
```

Degradê metálico para divisórias/barras de destaque:
`linear-gradient(90deg, #6E5A28, #E8D493, #B8973F, #F2E6B8, #6E5A28)`

Título em serifa maiúscula com espaçamento entre letras (ecoando a logo).
Corpo em sem-serifa grossa. Números de dinheiro grandes. Mobile primeiro —
uso em pé, no meio do corte, com uma mão só. Botão grande. Tarefa comum em
até 3 toques. Sem formulário longo. Tudo em português (o sistema atual dele
está em inglês — não repetir isso).

## Fim de sessão

1. Resumir o que foi feito, em português
2. Atualizar `ESCOPO.md` e `PENDENCIAS.md` se alguma decisão mudou
3. Registrar decisão de arquitetura nova como ADR no fim de `ESCOPO.md`
4. Listar o que ficou pendente

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
