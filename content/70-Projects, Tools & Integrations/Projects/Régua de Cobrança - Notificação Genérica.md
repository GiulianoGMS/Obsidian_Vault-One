---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
  - "[[DDL-Oracle]]"
Squads:
  - "[[Comercial]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Acordos]]"
  - "[[E-mail]]"
  - "[[Régua de Cobrança]]"
Date: 2026-08-16
Type:
Project: "[[Régua de Cobrança - Implementação]]"
tags:
  - Projects
---

> [!info] Referência
> Procedure original: [[Régua de Cobrança - Implementação]]
> Repositório: [GiulianoGMS/PJ-Regua-de-Cobranca — NAGP_EMAIL_REGUA_COBRANCA_AGRUP.prc](https://github.com/GiulianoGMS/PJ-Regua-de-Cobranca/blob/main/NAGP_EMAIL_REGUA_COBRANCA_AGRUP.prc)

---

## Contexto

Por solicitação da **diretoria**, foi criada uma variante da procedure de cobrança que envia um e-mail **genérico** ao representante do fornecedor — sem expor os detalhes internos dos acordos. O objetivo é notificar a existência de pendências sem revelar números de acordo, parcelas ou valores.

---

## Diferenças em relação à `NAGP_EMAIL_REGUA_COBRANCA`

| Aspecto | Procedure original | Nova procedure (`_AGRUP`) |
|---|---|---|
| **Conteúdo do e-mail** | Tabela HTML com acordo, tipo, parcela, vencimento e valor | Mensagem genérica — sem nenhum detalhe de acordo |
| **Dados não enviados ao representante** | — | Nº do acordo, descrição, tipo, nº da parcela, vencimento, valor em aberto |
| **Anti-resend nível crítico** | Não possui | Bloqueia reenvio se ≥ 4 envios já registrados desde 2026-08-01 para o mesmo acordo/parcela/representante |
| **Log** | Por acordo/parcela (loop) | Por acordo/parcela (loop) — **sem alteração** |
| **Envio** | Um e-mail consolidado por representante | Um e-mail consolidado por representante — **sem alteração** |

---

## Parâmetros

Idênticos à procedure original:

```sql
NAGP_EMAIL_REGUA_COBRANCA_AGRUP(
  psEmail               VARCHAR2,   -- E-mail do representante (destinatário principal)
  psEnviaTICopia        VARCHAR2,   -- 'S'/'N' — cópia TI
  psEnviaCARCopia       VARCHAR2,   -- 'S'/'N' — cópia CAR
  psEnviaFinFornecCopia VARCHAR2,   -- 'S'/'N' — cópia Financeiro Fornecedor
  psEnviaCompCopia      VARCHAR2,   -- 'S'/'N' — cópia Comprador
  psEmailDir            VARCHAR2,   -- 'S'/'N' — cópia Diretoria
  psNivelRegua          NUMBER      -- Nível 1 a 4
)
```

---

## Anti-Resend — Segunda Camada

Além do anti-duplicidade diário padrão (`DATA_ENVIO >= TRUNC(SYSDATE)`), a nova procedure adiciona uma segunda verificação: **não reenvia se o acordo já foi cobrado 4 ou mais vezes desde 01/08/2026 e ainda está em aberto**.

```sql
AND NOT EXISTS (
    SELECT 2
      FROM FI_TITULO FI
     WHERE FI.SEQPESSOA  = A.COD_FORNECEDOR
       AND FI.CODESPECIE LIKE 'AC%'
       AND FI.ABERTOQUITADO = 'A'
       AND FI.VLRPAGO < FI.VLRNOMINAL
       AND EXISTS (
               SELECT 1
                 FROM NAGT_LOG_ENVIO_ACO_EMAIL AC
                WHERE AC.NRO_ACORDO    = FI.NROTITULO
                  AND AC.PARCELA       = FI.NROPARCELA || '/' || FI.QTDPARCELA
                  AND AC.DATA_ENVIO   >= DATE '2026-08-01'
                  AND AC.TIPO         = 'Regua'
                  AND AC.EMAIL_DESTINO LIKE '%' || A.EMAIL_REP || '%'
               HAVING COUNT(1) >= 4
       )
)
```

> Evita reenvios contínuos para acordos inadimplentes já amplamente notificados, que devem ser tratados por outro canal (bloqueio, negociação direta).

---

## Mensagem por Nível da Régua

O corpo do e-mail é genérico, mas a frase de urgência varia conforme o nível:

| Nível | Marco | Mensagem de urgência |
|---|---|---|
| 1 | D+1 | *"… bloqueio nos pedidos em até **15 dias**."* |
| 2 | D+6 | *"… bloqueio nos pedidos em até **10 dias**."* |
| 3 | D+11 | *"… bloqueio nos pedidos em até **5 dias**."* |
| ≥ 4 | D+16+ | *"… pedidos irão permanecer **bloqueados** até a regularização."* |

---

## Fluxo

```
Orquestrador (Loop de Chamada)
         │
         ▼
NAGP_EMAIL_REGUA_COBRANCA_AGRUP (por representante + nível)
         │
         ├─ Anti-duplicidade diário  (DATA_ENVIO >= TRUNC(SYSDATE))
         ├─ Anti-resend crítico      (≥ 4 envios desde 2026-08-01 + acordo ainda aberto)
         │
    vsQtd = 0? → RETURN
         │
         ▼
Monta e-mail genérico (sem detalhes de acordo)
         │
         ▼
Loop por acordo/parcela → INSERT NAGT_LOG_ENVIO_ACO_EMAIL
         │
         ▼
SP_ENVIA_EMAIL → 1 envio consolidado para todos os destinatários ativos
         │
         ▼
COMMIT
```

---

## Destinatários

Mesma lógica de cópia da procedure original — resolvidos pelas funções internas:

| Função | Destinatário |
|---|---|
| `vsEmail` | Representante do fornecedor (`psEmail`) |
| `fEmailCAR()` | Time C.A.R |
| `fEmailDiretoria()` | Diretoria |
| `psEmailFinFornec` | Financeiro do Fornecedor (da view base) |
| `psEmailComprador` | Comprador (`NAGT_EMAILCOMPRADORES`) |
| `fEmailTI()` | TI |

Todos são concatenados em uma única chamada `SP_ENVIA_EMAIL` — o e-mail sai uma única vez por representante por nível.

---

## Atualização do Orquestrador

Para utilizar a nova procedure, substituir as chamadas do loop de `NAGP_EMAIL_REGUA_COBRANCA` por `NAGP_EMAIL_REGUA_COBRANCA_AGRUP` mantendo os mesmos parâmetros. Ver escalonamento de cópias por nível em [[Régua de Cobrança - Implementação]].

---
### Imagem:

![[{7C1AA492-C992-4D73-94FB-F3C72D447971}.png]]