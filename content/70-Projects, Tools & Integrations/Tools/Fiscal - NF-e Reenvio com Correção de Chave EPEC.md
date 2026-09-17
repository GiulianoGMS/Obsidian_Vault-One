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
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[NFe]]"
  - "[[Fiscal]]"
  - "[[EPEC]]"
  - "[[NDD]]"
Date: 2026-09-17
Type: "[[Procedure]]"
tags:
  - Tools
---

> [!info] Referência
> [GiulianoGMS/DDL-Objects-Oracle — NAGP_NFE_REENVIANF.prc](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/bf4213850d6fa29e81f7bdc551043eb9ee4adbe3/NAGP_NFE_REENVIANF.prc)

---

## Contexto

Procedimento para **desfazer uma troca de chave** de NF-e no ERP e **reenviar o XML original** para a NDD. Usado quando a chave de uma [[EPEC]] foi gravada erroneamente no ERP no lugar da chave da NF-e normal — situação que impede o processamento correto pela [[NDD]].

Se o parâmetro `EscondeEpec = 'S'` não for utilizado, a EPEC correspondente deve ser **cancelada manualmente na NDD** antes ou após a execução.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `NAGP_NFE_REENVIANF` | Procedure | Corrige chave no ERP e reenvia NF-e original via NDD |
| `MLF_NOTAFISCAL` | Tabela | NF-e do ERP — campo `NFECHAVEACESSO` corrigido |
| `TBDATABASEINPUT` | Tabela | Fila de processamento NDD — `STATUS = 0` força reenvio |
| `NDD_CONNECTOR.TBLOGDOCUMENT` | Tabela | Log de documentos na NDD — `HIDDEN = 1` oculta EPEC |

---

## Parâmetros

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `ChaveAntiga` | `VARCHAR2` | Chave correta da NF-e original (44 dígitos) |
| `ChaveNova` | `VARCHAR2` | Chave da EPEC gravada erroneamente no ERP |
| `EscondeEpec` | `VARCHAR2` | `'S'` para ocultar a EPEC na NDD; qualquer outro valor pula a etapa |
| `vOutput` | `OUT VARCHAR2` | Retorno textual com o resultado de cada etapa |

---

## Fluxo

```
1. UPDATE MLF_NOTAFISCAL
      SET NFECHAVEACESSO = ChaveAntiga
    WHERE NFECHAVEACESSO = ChaveNova
      AND DTAEMISSAO >= SYSDATE - 30
   → "Chave trocada no ERP: SIM/NAO"

2. UPDATE TBDATABASEINPUT
      SET STATUS = 0
    WHERE CHAVEACESSO = ChaveAntiga
      AND ROWNUM = 1
   → "Chave Original Reenviada: SIM/NAO"

3. (se EscondeEpec = 'S')
   UPDATE NDD_CONNECTOR.TBLOGDOCUMENT
      SET HIDDEN = 1
    WHERE ACCESSKEY = ChaveNova
      AND EMISSIONDATE >= SYSDATE - 30
   → "Hidden EPEC: SIM/NAO"
```

> [!warning] Janela de 30 dias
> As atualizações em `MLF_NOTAFISCAL` e `NDD_CONNECTOR.TBLOGDOCUMENT` filtram apenas registros com data dos últimos 30 dias (`SYSDATE - 30`). Fora desse intervalo, as etapas retornam `NAO` sem erro — verificar as chaves manualmente.

---

## Chamada

```sql
DECLARE
  vOutput VARCHAR2(500);
BEGIN
  NAGP_NFE_REENVIANF(
    ChaveAntiga  => '35XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ChaveNova    => '35YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
    EscondeEpec => 'S',
    vOutput      => vOutput
  );
  DBMS_OUTPUT.PUT_LINE(vOutput);
END;
```

**Saída esperada (sucesso completo):**
```
Chave trocada no ERP: SIM Chave Original Reenviada: SIM Hidden EPEC: SIM
```

---

## Quando usar

| Situação | Ação recomendada |
|---|---|
| EPEC emitida em contingência — NF-e normal precisa ser reprocessada | Executar com `EscondeEpec = 'S'` |
| NF-e normal a ser reenviada, mas EPEC já cancelada na NDD | Executar com `EscondeEpec = 'N'` |
| Chave da NF-e original não está em `TBDATABASEINPUT` | Verificar manualmente — reenvio não será disparado |
