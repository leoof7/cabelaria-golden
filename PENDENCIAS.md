# PENDÊNCIAS — coisas que dependem de resposta do Leo

Nada aqui trava o desenvolvimento: onde falta resposta, o sistema segue com
um padrão razoável e editável na tela. Esta lista existe para não esquecer
de confirmar antes de ir para produção.

## Alta prioridade

- [ ] Durações erradas: Hidratação 5min, Platinado 30min, Selagem 30min,
      Luzes 20min, Sobrancelha 5min, Pezinho 5min. Perguntar a duração real
      de cada uma antes da produção, senão a agenda vai gerar conflito na
      cadeira.
- [ ] Preços de todos os serviços — não aparecem no sistema atual, os que
      estão no app são chute de mercado.
- [ ] Nomes reais dos 2 profissionais (hoje "Equipe 1" e "Equipe 2").
- [ ] "Corte" está 4x e "Manutenção" 3x no sistema dele — são variações de
      quê?

- [ ] Ele usa o plano **AVANÇADO** do Salon Soft (R$ 69,90/mês) — inclui
      estoque, fornecedores, fiado, comissão e gestão financeira. Isso é a
      referência de preço e de comparação que ele usa hoje. Ainda não
      sabemos quais dessas funções ele usa de fato — pergunta já enviada a
      ele: **quais funções do plano Avançado ele usa toda semana: fiado,
      estoque, fornecedores, comissão, relatório financeiro?**
- [ ] Depois que o Leo criar a própria conta no sistema (login), alguém
      precisa promovê-lo a "dono" manualmente, uma vez só, direto no painel
      do Supabase (tabela `perfil`, coluna `papel`). Lembrar disso quando
      chegar a tela de login.

## Média prioridade

- [ ] Regra de comissão: percentual ou aluguel de cadeira? Igual para todo
      serviço? Produto desconta? Desconto afeta? Periodicidade de
      pagamento?
- [ ] A página pública deve mostrar preço ou não? (a dele não mostra)
- [ ] Atende mulher e criança? A logo diz UNISEX & INFANTIL e a lista tem
      química, mas ele falou que é masculino.
- [ ] Horário de funcionamento do salão e de cada profissional — padrão
      usado por enquanto: 09:00 às 20:30, editável por profissional.

## Baixa prioridade

- [ ] Qual plano do Salon Soft ele paga hoje. **Respondido:** plano
      Avançado, R$ 69,90/mês (ver item de alta prioridade acima sobre quais
      funções ele realmente usa).
- [ ] O que roda o robô de WhatsApp atual.
- [ ] Ele já paga Meta Verified?

## Confirmado — fora do escopo (não perguntar de novo)

- **Fiado**: confirmado que o Leo não trabalha com fiado. Não existe tela,
  saldo devedor nem relatório de pendência neste sistema. A diferença entre
  `valor_cobrado` e `valor_pago` no atendimento é **desconto**, não fiado.
- **Estoque e fornecedores**: fora do escopo v1, mesmo aparecendo no plano
  Avançado do Salon Soft que ele paga hoje.
