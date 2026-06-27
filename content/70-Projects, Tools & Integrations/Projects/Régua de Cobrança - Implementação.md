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

Automação de cobrança escalonada para fornecedores com acordos comerciais em aberto. O sistema monitora diariamente as parcelas vencendo, envia e-mails progressivos nos marcos D0, D+5, D+10 e D+15, e bloqueia automaticamente novos lotes de compra quando há inadimplência.

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
- `NAGV_TAE_ACORDOS_V4` — view master de acordos
- `FI_TITULO` — títulos financeiros (parcelas)
- `MAF_FORNECCONTATO` — contatos do fornecedor

**Cálculo do Nível da Régua (`NIVEL_REGUA`):**

```sql
CASE
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = 15 THEN 1   -- D0
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = 10 THEN 2   -- D+5
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) = 5  THEN 3   -- D+10
  WHEN F.DTAVENCIMENTO - TRUNC(SYSDATE) <= 0 THEN 4   -- D+15 (vencido)
END NIVEL_REGUA
```
---

### `Loop de Chamada da Regua` — Orquestrador

Executa diariamente. Percorre os representantes distintos com acordos no nível ativo e chama `NAGP_EMAIL_REGUA_COBRANCA` com as permissões de cópia adequadas para cada nível.

**Escalonamento de cópias por nível:**

| Nível | Marco | Dias restantes | C.A.R | Fin. Fornec. | Comprador | Diretoria |
| ----- | ----- | -------------- | ----- | ------------ | --------- | --------- |
| 1     | D0    | 15 dias        | ✗     | ✗            | ✗         | ✗         |
| 2     | D+5   | 10 dias        | ✓     | ✓            | ✓         | ✗         |
| 3     | D+10  | 5 dias         | ✓     | ✓            | ✓         | ✗         |
| 4     | D+15  | 0 dias         | ✓     | ✓            | ✓         | ✓         |

---

### `NAGP_EMAIL_REGUA_COBRANCA` — Procedure Principal

Monta e envia o e-mail HTML para um representante, agrupando todos os seus acordos em aberto em uma única mensagem.

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
1. Busca os dados da view base filtrando pelo e-mail do representante e nível
2. Agrega acordos distintos e coleta: nome do comprador, representante, fornecedor, e-mails
3. Monta lista de destinatários em cópia conforme parâmetros `'S'/'N'`
4. Gera tabela HTML com todas as parcelas em aberto (acordo, parcela, vencimento, valor)
5. Constrói e-mail HTML completo com cabeçalho, mensagem dinâmica e rodapé
6. Envia via `CONSINCO.SP_ENVIA_EMAIL()`
7. Registra log em `NAGT_LOG_ENVIO_ACO_EMAIL`

**Assunto do e-mail:** `Nagumo - Acordos Comerciais - Pendências de Pagamentos`

---

## Template de E-mail

O corpo é gerado dinamicamente em HTML. A mensagem varia conforme o nível:

| Nível    | Texto dinâmico (`[X] dias`)           |
| -------- | ------------------------------------- |
| 1 (D0)   | "…bloqueio do pedido em **15 dias**." |
| 2 (D+5)  | "…bloqueio do pedido em **10 dias**." |
| 3 (D+10) | "…bloqueio do pedido em **5 dias**."  |
| 4 (D+15) | *(pendente definição)*                |

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

Adicionada à view `MACV_CONSISTELOTECOMPRA`. Bloqueia a geração do lote quando o fornecedor possui parcelas vencidas e não quitadas para o representante vinculado ao pedido.

**Condição de bloqueio:**
```sql
R.DIAS_ATE_VENC < 0  -- Parcela já vencida (negativo = dias em atraso)
```

**Mensagem exibida no sistema:**
```
Consistência 110:
"Existem Pagamentos/Parcelas de Acordos Vencidas e não Quitadas para o Representante!"
Complemento: Rep.: [NOME] Acordo: [NRO] Parcela: [X] Valor.: [R$ X,XX]
```

> [!note] Print
> ![[Pasted image 20260612155407.png]]

> [!warning] Restrição de testes
> Durante a validação, o bloqueio está restrito ao lote de compra `SEQGERCOMPRA = 444278`. Após aprovação, remover o filtro para aplicar a todos os lotes.

---

## Liberação de Lote Bloqueado

Quando um lote é bloqueado pela crítica de acordo vencido, é possível liberá-lo manualmente através de uma view disponível no Consinco.

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
| `EMAILS_ENVIADOS` | Todos os destinatários concatenados |
| `QTD_ACORDOS` | Quantidade de acordos no e-mail |
| `HTML_ENVIADO` | Corpo completo do e-mail |
| `DT_ENVIO` | Timestamp do envio |

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
| `NAGT_LOG_ENVIO_ACO_EMAIL` | Tabela | Log de e-mails enviados pela régua |
| `CONSINCO.SP_ENVIA_EMAIL` | Procedure | Envio de e-mail via Consinco |

---

## Pendências

- [ ] Definir mensagem do D+15 com time Falconi
- [x] Adicionar Diteroria nas notificações D+15
- [ ] Remover restrição do lote de testes (`SEQGERCOMPRA = 444278`) após validação do bloqueio
- [ ] Confirmar lista de fornecedores "Elegíveis a Cobrar" e data de corte para acordos legados

---

## Notas de Implementação

> [!tip] Elegíveis x Novos acordos
> A view base usa `DATA_EMISSAO >= SYSDATE - 30` como janela. Para os **Elegíveis a Cobrar** (fornecedores da lista), a data de referência no e-mail é a data do acordo em aberto mais antigo. Para **Novos acordos**, a data é a data de implementação da régua.

> [!warning] D+15 pendente
> O texto do e-mail no nível 4 ainda contém o placeholder `"...Pendente Falconi definir mensagem no D+15..."`. Não liberar este nível em produção antes da definição.
