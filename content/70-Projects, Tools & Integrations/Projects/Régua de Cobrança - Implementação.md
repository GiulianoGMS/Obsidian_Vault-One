---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
  - "[[DDL-Oracle]]"
Squads:
  - "[[Comercial]]"
  - "[[TI]]"
  - "[[Falconi]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Acordos]]"
  - "[[Critica Lote de Compras]]"
  - "[[E-mail]]"
Date: 2026-06-12
Type:
Project: "[[Régua de Cobrança - Escopo]]"
---
> [!info] Referência
> Escopo original: [[Régua de Cobrança - Escopo]]  
> Repositório: [GiulianoGMS/PJ-Regua-de-Cobranca](https://github.com/GiulianoGMS/PJ-Regua-de-Cobranca)

---
## Visão Geral

Automação de cobrança escalonada para fornecedores com [[acordos]] comerciais em aberto. O sistema monitora diariamente as parcelas vencendo, envia e-mails progressivos nos marcos D0, D+5, D+10 e D+15, e bloqueia automaticamente novos lotes de compra quando há inadimplência.

---
## Arquitetura

```
NAGV_BASE_REGUA_COBRANCA.sql       ← View base: parcelas em aberto + nível da régua
        ↓
Loop de Chamada da Regua.sql       ← Cursor por representante → chama a procedure
        ↓
NAGP_EMAIL_REGUA_COBRANCA.prc      ← Monta e envia o e-mail HTML com log
        ├── fEmailCAR.fnc           ← Retorna e-mail do time CAR
        ├── fEmailDiretoria.fnc     ← Retorna e-mail da diretoria
        └── fEmailFinFornec.fnc     ← Retorna e-mail do financeiro do fornecedor

Crítica no lote de Compras.sql     ← Bloqueia lote de compra se houver parcela vencida
        ↓ (se bloqueado)
NAGP_LIBERA_LOTE_CRIT.prc         ← Libera a crítica manualmente via view Consinco
        └── Comercial > Liberação de Críticas  (acesso: THAISE, RONIE)
```

---
## Componentes

### `NAGV_BASE_REGUA_COBRANCA` — View Base

Consolida todos os acordos com parcelas em aberto elegíveis à cobrança.

**Fontes:**
- `NAGV_TAE_ACORDOS_V4` — view master de [[acordos]]
- `FI_TITULO` — [[títulos]] financeiros (parcelas)
- `MAF_FORNECCONTATO` — contatos do [[fornecedor]]

**Cálculo do Nível da Régua (`NIVEL_REGUA`):**

> [!warning] Lógica pós-vencimento
> A régua foi invertida: os disparos ocorrem **após** o vencimento, não antes. Valores negativos = dias em atraso.

```sql
CASE
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = -1  THEN 1   -- D+1  (1 dia após vencimento)
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = -6  THEN 2   -- D+6
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = -11 THEN 3   -- D+11
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) <= -16 THEN 4  -- D+16 em diante
END NIVEL_REGUA
```

**Demais filtros da view:**
- `DATA_EMISSAO >= DATE '2026-07-14'` — data fixa de corte (substituiu `SYSDATE - 30`)
- `NIVEL_REGUA IS NOT NULL` — exclui registros fora dos marcos de disparo
- `NOT EXISTS (NAGT_LOG_ENVIO_ACO_EMAIL WHERE DATA_ENVIO >= TRUNC(SYSDATE) AND TIPO = 'Regua')` — anti-duplicidade: exclui acordos já enviados no dia
- `PARCELA` corrigido para `NROPARCELA||'/'||QTDPARCELA` (ordem parcela atual / total)
---
### `Loop de Chamada da Regua` — Orquestrador

Executa diariamente. Percorre os representantes distintos com [[acordos]] no nível ativo e chama `NAGP_EMAIL_REGUA_COBRANCA` com as permissões de cópia adequadas para cada nível.

**Escalonamento de cópias por nível:**

| Nível | Marco | Atraso       | C.A.R | Fin. Fornec. | Comprador | Diretoria |
| ----- | ----- | ------------ | ----- | ------------ | --------- | --------- |
| 1     | D+1   | 1 dia        | ✗     | ✗            | ✗         | ✗         |
| 2     | D+6   | 6 dias       | ✓     | ✓            | ✓         | ✗         |
| 3     | D+11  | 11 dias      | ✓     | ✓            | ✓         | ✗         |
| 4     | D+16+ | 16+ dias     | ✓     | ✓            | ✓         | ✓         |
# Loop no PLSQL

[[Job]]: **NAGJ_REGUA_DE_COBRANCA**

Comando:

```sql
BEGIN
  FOR email IN (SELECT DISTINCT XX.EMAIL_REP EMAIL FROM NAGV_BASE_REGUA_COBRANCA XX WHERE NIVEL_REGUA IS NOT NULL) 
  LOOP
    -- Nivel 1
    NAGP_EMAIL_REGUA_COBRANCA(psEmail => email.EMAIL, psEnviaTICopia => 'N',
                              psEnviaCARCopia => 'N', psEnviaFinFornecCopia => 'N',
                              psEnviaCompCopia => 'N', psEmailDir => 'N', psNivelRegua => 1);
    -- Nivel 2
    NAGP_EMAIL_REGUA_COBRANCA(psEmail => email.EMAIL, psEnviaTICopia => 'N',
                              psEnviaCARCopia => 'S', psEnviaFinFornecCopia => 'N',
                              psEnviaCompCopia => 'S', psEmailDir => 'N', psNivelRegua => 2);
    -- Nivel 3
    NAGP_EMAIL_REGUA_COBRANCA(psEmail => email.EMAIL, psEnviaTICopia => 'N',
                              psEnviaCARCopia => 'S', psEnviaFinFornecCopia => 'N',
                              psEnviaCompCopia => 'S', psEmailDir => 'N', psNivelRegua => 3);
    -- Nivel 4
    NAGP_EMAIL_REGUA_COBRANCA(psEmail => email.EMAIL, psEnviaTICopia => 'S',
                              psEnviaCARCopia => 'S', psEnviaFinFornecCopia => 'N',
                              psEnviaCompCopia => 'S', psEmailDir => 'S', psNivelRegua => 4);
  END LOOP;
END;
```

---

### `NAGP_EMAIL_REGUA_COBRANCA` — Procedure Principal

Monta e envia o [[e-mail ]][[HTML]] para um [[representante]], agrupando todos os seus acordos em aberto em uma única mensagem.

**Parâmetros:**
```sql
NAGP_EMAIL_REGUA_COBRANCA(
  psEmail               VARCHAR2,   -- E-mail do representante (destinatário principal)
  psEnviaTICopia        VARCHAR2,   -- 'S'/'N' — cópia para TI
  psEnviaCARCopia       VARCHAR2,   -- 'S'/'N' — cópia para CAR
  psEnviaFinFornecCopia VARCHAR2,   -- 'S'/'N' — cópia para financeiro do fornecedor
  psEnviaCompCopia      VARCHAR2,   -- 'S'/'N' — cópia para comprador
  psEmailDir            VARCHAR2,   -- 'S'/'N' — cópia para diretoria
  psNivelRegua          NUMBER      -- Nível 1 a 4
)
```

**Fluxo interno:**
1. Anti-duplicidade: verifica `NAGT_LOG_ENVIO_ACO_EMAIL` — se o acordo já foi enviado hoje (`DATA_ENVIO >= TRUNC(SYSDATE)` e `TIPO = 'Regua'`), ignora
2. Busca os dados da view base filtrando pelo e-mail do [[representante]] e nível
3. Agrega acordos distintos e coleta: nome do [[comprador]], [[representante]], [[fornecedor]], e-mails
4. Monta lista de destinatários em cópia conforme parâmetros `'S'/'N'`
5. Para cada parcela no loop: **insere log** em `NAGT_LOG_ENVIO_ACO_EMAIL` com `TIPO = 'Regua'` e `PARCELA` antes do envio
6. Gera tabela HTML com todas as parcelas em aberto (acordo, parcela, vencimento, valor)
7. Constrói e-mail HTML completo com cabeçalho, mensagem dinâmica e rodapé
8. Envia via `CONSINCO.SP_ENVIA_EMAIL()` para **todos** os destinatários ativos (`psEmailComprador + psEmailFinFornec + psEmailCAR + psEmailTI + psEmailDiretoria + vsEmail`)

**Assunto do e-mail:** `Nagumo - Acordos Comerciais - Pendências de Pagamentos`

---

## Template de E-mail

O corpo é gerado dinamicamente em HTML. A mensagem varia conforme o nível:

| Nível     | Texto dinâmico                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 (D+1)   | "…parcelas vencidas… bloqueio do pedido em `DIAS_ATE_VENC` dias."                                                       |
| 2 (D+6)   | "…parcelas vencidas… bloqueio do pedido em `DIAS_ATE_VENC` dias."                                                       |
| 3 (D+11)  | "…parcelas vencidas… bloqueio do pedido em `DIAS_ATE_VENC` dias."                                                       |
| 4 (D+16+) | "Informamos que o prazo para normalização dos pagamentos expirou. Conforme comunicado anteriormente, seus pedidos foram bloqueados até a regularização." |

**Estrutura do e-mail:**

```
[Logo Nagumo]
[Cabeçalho vermelho degradê]

Prezado(a) [Nome do Representante],

Identificamos que há parcelas de acordos em aberto
vinculados à empresa [Nome do Fornecedor].

Solicitamos, por gentileza, a regularização dos pagamentos
para não sofrer bloqueio do pedido em [X] dias.

Parcelas em aberto emitidas a partir do dia [X]:

┌─────────────┬──────────────┬────────┬────────────┬──────────┐
│ Nº Acordo   │ Descrição    │ Tipo   │ Parcela    │ Valor    │
├─────────────┼──────────────┼────────┼────────────┼──────────┤
│ [NRO]       │ [DESC]       │ [TIPO] │ [X/TOTAL]  │ R$ X,XX  │
└─────────────┴──────────────┴────────┴────────────┴──────────┘

Caso o pagamento já tenha sido realizado, favor desconsiderar.

Dúvidas: lista.contasareceber@nagumocombr.onmicrosoft.com

Atenciosamente,
Administração Nagumo
```

> [!note] Print
>![[{1BBD897B-24A6-4600-83D1-6B8C3E71C1FF}.png]]

---

## Funções de E-mail

### `fEmailCAR` — Contas a Receber
Retorna o e-mail fixo do time de Contas a Receber (CAR). Valor configurado diretamente na função.

### `fEmailDiretoria` — Diretoria
Retorna o e-mail fixo da diretoria. Valor configurado diretamente na função.

### `fEmailFinFornec` — Financeiro do Fornecedor
Busca dinamicamente em `MAF_FORNECCONTATO` pelo tipo de contato `'F'` (Financeiro), retornando o e-mail do primeiro registro encontrado para o fornecedor informado.

Para o email do fornecedor, é preciso que o mesmo existe no respectivo cadastro como "Financeiro"

![[Pasted image 20260612160619.png]]

---

## Crítica no Lote de Compras (Bloqueio)

Adicionada à view `MACV_CONSISTELOTECOMPRA`. Bloqueia novos lotes quando o fornecedor possui parcelas de acordos com **todos os 4 níveis de e-mail já enviados** e a parcela ainda não quitada.

**Condição de bloqueio (reformulada):**

O bloqueio não usa mais `NAGV_BASE_REGUA_COBRANCA` — consulta `FI_TITULO` diretamente e verifica o log:

```sql
-- bloqueia se: todos os 4 níveis já foram enviados E o lote não foi liberado manualmente
EXISTS (
    SELECT 1 FROM NAGT_LOG_ENVIO_ACO_EMAIL AC
    WHERE AC.NRO_ACORDO = FI.NROTITULO
      AND AC.PARCELA    = FI.NROPARCELA||'/'||FI.QTDPARCELA
      AND AC.DATA_ENVIO >= DATE '2026-08-01'
      AND AC.TIPO       = 'Regua'
    HAVING COUNT(1) = 4   -- todos os 4 níveis enviados
)
AND NOT EXISTS (
    SELECT 1 FROM NAGT_LOTE_LIBERADO_CRIT L
    WHERE L.SEQGERCOMPRA = X.SEQGERCOMPRA
)
```

**Demais filtros do lote:**
- `SITUACAOLOTE NOT IN ('F','C')` — ignora lotes finalizados ou cancelados
- `DTAHORINCLUSAO >= SYSDATE - 30` — lotes dos últimos 30 dias

**Mensagem exibida no sistema:**
```
Consistência 110:
"Existem Pagamentos/Parcelas de Acordos Vencidas e não Quitadas para o Representante!"
Complemento: Rep.: [NOME] Acordo: [NRO] Parcela: [X/TOTAL] Valor.: [X]
```

> [!note] Print
> ![[Pasted image 20260612155407.png]]

> [!success] Restrição de teste removida
> O filtro `SEQGERCOMPRA = 444278` foi removido — crítica ativa para **todos os lotes** em produção.

---

## Liberação de Lote Bloqueado

Quando um [[lote]] é bloqueado pela [[[crítica]] de acordo vencido, é possível liberá-lo manualmente através de uma view disponível na Consinco.

**View no sistema:** `Comercial > Liberação de Críticas`

**Usuários com permissão de acesso e liberação:**
- `THAISE`
- `RONIE`

**Procedure chamada pela view:**
[`NAGP_LIBERA_LOTE_CRIT`](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_LIBERA_LOTE_CRIT.prc) — libera a inconsistência no lote, permitindo que a crítica seja reprocessada e o lote volte ao fluxo normal sem mais constar como bloqueado.

**Teste realizado com sucesso:** lote com inconsistência identificado → liberado pela view → crítica reprocessada → lote liberado e inconsistência removida.

---

## Log de Envios

Todos os envios são registrados em `NAGT_LOG_ENVIO_ACO_EMAIL`:

| Coluna | Conteúdo |
|--------|----------|
| `NRO_ACORDO` | Número do acordo |
| `COD_COMPRADOR` | Código do comprador |
| `EMAIL_DESTINO` | Todos os destinatários concatenados |
| `QTDE_ACORDOS` | Quantidade de acordos no e-mail |
| `HTML_EMAIL` | Corpo completo do e-mail |
| `DATA_ENVIO` | Timestamp do envio |
| `TIPO` | Sempre `'Regua'` — usado como filtro na crítica e na anti-duplicidade |
| `PARCELA` | `NROPARCELA/QTDPARCELA` — chave para verificar os 4 níveis na crítica |

> O log é inserido **por parcela dentro do loop**, antes do envio — permite rastrear exatamente quais parcelas receberam cada nível de notificação.

---

## Objetos de Banco Utilizados

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `NAGV_TAE_ACORDOS_V4` | View | Master de acordos comerciais |
| `FI_TITULO` | Tabela | Títulos financeiros / parcelas |
| `MAF_FORNECCONTATO` | Tabela | Contatos dos fornecedores |
| `MAC_GERCOMPRA` | Tabela | Cabeçalho do lote de compra |
| `MAC_GERCOMPRAFORN` | Tabela | Fornecedores do lote de compra |
| `esp_Mac_GerCompraCompl` | Tabela | Complemento do lote (e-mail do acordo) |
| `MACV_CONSISTELOTECOMPRA` | View | Consistências do lote (bloqueio adicionado aqui) |
| `NAGP_LIBERA_LOTE_CRIT` | Procedure | Libera crítica de lote bloqueado pela régua (via view Comercial > Liberação de Críticas) |
| `NAGT_LOG_ENVIO_ACO_EMAIL` | Tabela | Log de e-mails enviados pela régua (por parcela; campos `TIPO` e `PARCELA` usados na crítica) |
| `NAGT_LOTE_LIBERADO_CRIT` | Tabela | Controle de lotes liberados manualmente — exclui da crítica de bloqueio |
| `CONSINCO.SP_ENVIA_EMAIL` | Procedure | Envio de e-mail via Consinco |

---

## Pendências

- [x] Definir mensagem do D+16 com time [[Falconi]]
- [x] Adicionar Diretoria nas notificações D+16
- [x] Remover restrição do lote de testes (`SEQGERCOMPRA = 444278`) — crítica em produção
- [ ] Confirmar lista de fornecedores "Elegíveis a Cobrar" e data de corte para acordos legados

---

## Notas de Implementação

> [!tip] Elegíveis x Novos acordos
> A view base usa `DATA_EMISSAO >= SYSDATE - 30` como janela. Para os **Elegíveis a Cobrar** (fornecedores da lista), a data de referência no e-mail é a data do acordo em aberto mais antigo. Para **Novos acordos**, a data é a data de implementação da régua.

> [!tip] Elegíveis x Novos acordos (data de corte)
> `DATA_EMISSAO >= DATE '2026-07-14'` é a data fixa de entrada em produção. Acordos anteriores a essa data não entram na régua.
