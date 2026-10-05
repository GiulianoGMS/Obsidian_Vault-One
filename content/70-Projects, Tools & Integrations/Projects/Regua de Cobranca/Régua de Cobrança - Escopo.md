---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Comercial]]"
  - "[[TI]]"
  - "[[Contas à Receber]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Acordos]]"
  - "[[Verbas]]"
  - "[[E-mail]]"
Date: 2026-06-11
Type:
Project: "[[Régua de Cobrança - Escopo]]"
tags:
---
**Implementar fluxo de comunicação e bloqueio de pedidos** para casos com atraso superior a 15 dias;
 **Comunicar desde o D0** que o pedido será bloqueado em **D+15**, caso não ocorra o pagamento;

Crítica no lote de Compras:

![[Pasted image 20260612151731.png]]

A **Régua de Cobrança deverá ser aplicada** para todos os acordos emitidos a partir da data de implementação;
 
Além disso, deverá ser aplicada também para os fornecedores conforme ajuste do valor na **Consinco** (lista em anexo);
 
As **notificações devem ser enviadas** para o e-mail do **Financeiro do fornecedor** e para o **representante responsável pela assinatura do acordo**, mantendo o time de **Contas a Receber em cópia**.

 > ! O Email do Financeiro do Fornecedor deve ser cadastrado no ERP, no respectivo contato do representante do fornecedor, como no exemplo abaixo:
 ![[Pasted image 20260611130439.png]]
 > A rotina irá buscar a informação e concatenar "em cópia" junto ao e-mail do representante do acordo, além do e-mail do time C.A.R.

A aplicação deverá ser diferente para os dois casos específicos:

- **Elegíveis a Cobrar:**
- Deverá ser aplicada apenas para acordos dos fornecedores mencionados na lista anexada;
- Data a ser adicionada na parte do texto "Parcelas em aberto emitidas a partir do **dia [X]** (data mais antiga de acordo em aberto):".

- **Novos acordos:**
- Deverá ser aplicada a régua de cobrança apenas para acordos emitidos após a data de implementação da mesma;
- Data a ser adicionada na parte do texto "Parcelas em aberto emitidas a partir do **dia [X]** (data de implementação):".

**Fluxo completo da Régua de Cobrança** para referência:

![[Pasted image 20260611113006.png]]

**Abaixo, o texto padrão que deverá ser utilizado nos envios:**

"Prezado(a) [Nome do Fornecedor],  
Identificamos que há parcelas de acordos em aberto vinculados à sua empresa.

**Solicitamos, por gentileza, a regularização dos pagamentos para não sofrer bloqueio do pedido em** **[X] dias****.

Parcelas em aberto emitidas a partir do **dia [X]** _(data de implementação)_:

Acordo: [Nome/Número do Acordo] | Parcela: [Número da Parcela + Valor da Parcela]

Acordo: [Nome/Número do Acordo] | Parcela: [Número da Parcela + Valor da Parcela]

Acordo: [Nome/Número do Acordo] | Parcela: [Número da Parcela + Valor da Parcela]

Caso o pagamento já tenha sido realizado, favor desconsiderar este e-mail.

Em caso de dúvidas ou necessidade de suporte, contate [lista.contasareceber@nagumocombr.onmicrosoft.com] .

Atenciosamente,  
Administração Nagumo"

**Pontos de atenção:**

- O e-mail deverá ser enviado conforme os marcos do fluxo: **D0, D+5, D+10 e D+15**;
- O campo **[X] dias** deve ser atualizado conforme o prazo vigente:

- D0 → 15 dias
- D+5 → 10 dias
- D+10 → 5 dias
- D+15 → 0 dias (bloqueio imediato)
> ! D+15 - Validar a mensgem:
**Solicitamos, por gentileza, a regularização dos pagamentos para não sofrer bloqueio do pedido em 0 dias.**

E-mail:

![[{05103EBA-EB03-4F63-958D-ECA28C18F81B} 1.png]]

D15 Adicionar Thaise