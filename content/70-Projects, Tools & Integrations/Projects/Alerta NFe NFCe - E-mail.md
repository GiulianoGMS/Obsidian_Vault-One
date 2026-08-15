---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[Monitor PDV]]"
Open Tags:
  - "[[NFe]]"
  - "[[NFCe]]"
  - "[[Alertas]]"
  - "[[Monitoramento]]"
  - "[[E-mail]]"
Date: 2026-08-14
Type: Project
tags:
  - Projects
---

> [!info] Referência
> [GiulianoGMS/DDL-Objects-Oracle — NAGP_ENVIO_ALERTA_NFE_NFCE.prc](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_ENVIO_ALERTA_NFE_NFCE.prc)
> [[GLPI]] #746723

---

## Visão Geral

Procedure que monitora documentos NF-e / NFC-e com rejeições ou pendências de autorização no [[Monitor PDV]] e envia um **e-mail HTML** à equipe Fiscal/TI com um resumo por data, loja e código de retorno.

| Atributo | Valor |
|---|---|
| Procedure | `NAGP_ENVIO_ALERTA_NFE_NFCE` |
| Job | `CONSINCO.NAGJ_EMAILAUTO_ALERTA_NFE_NFCE` |
| Destinatário | Equipe Fiscal/TI |
| Envio | `CONSINCO.SP_ENVIA_EMAIL` via SMTP |

---

## Fontes de Dados

| Tabela | Uso |
|---|---|
| `MONITORPDV.TB_DOCTO` | Cabeçalho do documento: `NROEMPRESA`, `NROCHECKOUT`, `SEQDOCTO`, `DTAMOVIMENTO` |
| `MONITORPDV.TB_DOCTONFE` | Dados da NF-e: `CODRETORNO`, `RETORNO`, `PROTOCOLOENVIO` |

---

## Filtros Aplicados

```sql
WHERE A.DTAMOVIMENTO >= TRUNC(SYSDATE - 3)   -- últimos 3 dias
  AND B.PROTOCOLOENVIO IS NULL                -- sem protocolo de autorização
  AND B.CODRETORNO > 110                      -- rejeições significativas (> informativas)
  AND B.CODRETORNO NOT IN (psCodRetPD)        -- exclusões configuradas no PD
```

> **Códigos ≤ 110** são retornos informativos/de serviço da SEFAZ — não geram alerta.
> **`PROTOCOLOENVIO IS NULL`** garante que apenas documentos ainda pendentes são reportados.

---

## Parâmetro Dinâmico

| PD | Descrição |
|---|---|
| `CODRET_REMOV_EMAILNFE` | Lista CSV de `CODRETORNO` que **não** disparam notificação ao time Fiscal. Útil para excluir rejeições conhecidas/esperadas que não requerem ação imediata. |

O PD é lido via `SP_BUSCAPARAMDINAMICO` e convertido em tabela Oracle pela função `C5_COMPLEXIN.C5INTABLE` para uso no `NOT EXISTS`.

---

## Agrupamento do Relatório

```sql
GROUP BY A.DTAMOVIMENTO,
         B.CODRETORNO,
         REGEXP_REPLACE(B.RETORNO, '\[[^]]*\]', '')
```

| Coluna no e-mail | Origem |
|---|---|
| **Data** | `TB_DOCTO.DTAMOVIMENTO` |
| **Lojas** | `LISTAGG(DISTINCT B.NROEMPRESA, ', ')` |
| **Código** | `TB_DOCTONFE.CODRETORNO` |
| **Rejeição / Retorno** | `TB_DOCTONFE.RETORNO` com `[tags XML]` removidas via `REGEXP_REPLACE` |
| **Cupons** | `COUNT(*)` de documentos no grupo |

> `REGEXP_REPLACE(RETORNO, '\[[^]]*\]', '')` limpa o texto de retorno removendo prefixos de caminho XML que a SEFAZ inclui (ex: `[nfeProc][NFe][infNFe][det][prod]`), deixando apenas a mensagem legível.

---

## Fluxo

```
Job NAGJ_EMAILAUTO_ALERTA_NFE_NFCE
         │
         ▼
Lê PD CODRET_REMOV_EMAILNFE
         │
         ▼
COUNT documentos pendentes (últimos 3 dias, CODRETORNO > 110, sem protocolo, fora do PD)
         │
    vsQtdCupons = 0?
    └── Sim → RETURN (sem envio)
    └── Não → monta tabela HTML agrupada por data/código/retorno
         │
         ▼
Monta e-mail HTML completo (header Nagumo + tabela + footer)
         │
         ▼
SP_ENVIA_EMAIL → equipe Fiscal/TI
         │
         ▼
COMMIT
```

---

## Resumo no Cabeçalho do E-mail

> *"Foram identificados **N** cupom(ns) rejeitados ou com pendência no processamento da NFe/NFCe nos últimos 3 dias, distribuídos em **K** código(s) de retorno."*

- `N` = `vsQtdCupons` — total de documentos afetados
- `K` = `vsQtdCriticas` — quantidade de `CODRETORNO` distintos

---

## Manutenção

**Consultar exclusões do PD:**
```sql
SELECT CODPARAM, CODRET_REMOV
  FROM NAGT_PARAM_DINAMICO
 WHERE CODPARAM = 'CODRET_REMOV_EMAILNFE';
```

**Verificar documentos que disparariam o alerta agora:**
```sql
SELECT A.DTAMOVIMENTO,
       B.CODRETORNO,
       REGEXP_REPLACE(B.RETORNO, '\[[^]]*\]', '') AS RETORNO,
       LISTAGG(DISTINCT B.NROEMPRESA, ', ') WITHIN GROUP (ORDER BY B.NROEMPRESA) AS LOJAS,
       COUNT(*) AS QTDE
  FROM MONITORPDV.TB_DOCTO A
  JOIN MONITORPDV.TB_DOCTONFE B
    ON A.NROEMPRESA  = B.NROEMPRESA
   AND A.NROCHECKOUT = B.NROCHECKOUT
   AND A.SEQDOCTO    = B.SEQDOCTO
 WHERE A.DTAMOVIMENTO >= TRUNC(SYSDATE - 3)
   AND B.PROTOCOLOENVIO IS NULL
   AND B.CODRETORNO > 110
 GROUP BY A.DTAMOVIMENTO, B.CODRETORNO, REGEXP_REPLACE(B.RETORNO, '\[[^]]*\]', '')
 ORDER BY A.DTAMOVIMENTO, B.CODRETORNO;
```
