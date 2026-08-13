---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PDV]]"
Open Tags:
  - "[[Trigger]]"
  - "[[Log]]"
  - "[[PDV]]"
  - "[[Auditoria]]"
Date: 2026-08-13
Type: Ferramenta
---

> [!info] Ocorrência
> Time responsável alterou o IP de um software PDV (`MRL_EMPSOFTPDV`) via aplicação — campo que não deveria ser editável pela equipe. A ferramenta rastreia quem e quando alterou, mantendo histórico completo das versões anteriores dos registros.

---

## Visão Geral

Conjunto de objetos Oracle para **auditoria de alterações** na tabela `MRL_EMPSOFTPDV` (configuração de software/integração por empresa [[PDV]]). A cada `UPDATE`, a trigger salva o estado **anterior** do registro em `NAGT_MRL_EMPSOFTPDV_LOG`, incluindo o usuário Oracle e o timestamp da alteração.

---

## Objetos

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `NAGT_MRL_EMPSOFTPDV_LOG` | Tabela | Histórico de versões anteriores de `MRL_EMPSOFTPDV` |
| `NAGTR_MRL_EMPSOFTPDV_LOG` | Trigger | `BEFORE UPDATE` — captura `:OLD` e insere no log |

---

## Tabela de Log — `NAGT_MRL_EMPSOFTPDV_LOG`

Criada como cópia estrutural de `MRL_EMPSOFTPDV`, com duas colunas adicionais de auditoria:

```sql
CREATE TABLE NAGT_MRL_EMPSOFTPDV_LOG AS SELECT * FROM MRL_EMPSOFTPDV;
TRUNCATE TABLE NAGT_MRL_EMPSOFTPDV_LOG;
-- Adicionar após a criação:
ALTER TABLE NAGT_MRL_EMPSOFTPDV_LOG ADD USUARIO_LOG VARCHAR2(100);
ALTER TABLE NAGT_MRL_EMPSOFTPDV_LOG ADD DATA_LOG    DATE;
```

| Coluna extra | Conteúdo |
|---|---|
| `USUARIO_LOG` | Usuário Oracle que executou o `UPDATE` (`SELECT USER FROM DUAL`) |
| `DATA_LOG` | `SYSDATE` no momento do disparo da trigger |

> Registra o estado **antes** da alteração (`:OLD`) — permite comparar o valor anterior com o atual.

---

## Trigger — `NAGTR_MRL_EMPSOFTPDV_LOG`

```sql
CREATE OR REPLACE TRIGGER CONSINCO.NAGTR_MRL_EMPSOFTPDV_LOG
BEFORE UPDATE ON CONSINCO.MRL_EMPSOFTPDV
FOR EACH ROW
DECLARE
    V_USUALTERACAO VARCHAR2(100);
BEGIN
    SELECT USER INTO V_USUALTERACAO FROM DUAL;

    INSERT INTO CONSINCO.NAGT_MRL_EMPSOFTPDV_LOG (
        NROEMPRESA, SOFTPDV, DIRETIMPORTARQUIVO, DIRETEXPORTARQUIVO,
        TIPOEXPORTACAO, DIRETTEMP, NOMEVIEW, TIPOCARGA, TIPOSOFT,
        STATUS, DTAALTERACAO, USUALTERACAO, DTAIMPORTEXPORT, USUIMPORTEXPORT,
        NROGONDOLA, SEQEXPORTACAO, DIRETDESTINO, TIPODADOLINHA, NROCARGAPDV,
        INDCORTADIGBALANCA, INDDESCBALANCA, DIRETEXPORTARQPRECOPROMOC,
        INDGERATXTNFE, SUFIXO_ARQUIVO_EDI, NOMEQRPETIQUETA, QTDCOLUNASETIQ,
        PREFIXO_ARQUIVO_EDI, VERSAOLAYOUT, NOMEJOBNFE, NOMEJOBMDFE,
        INDETIQWEB, NOMEVIEWETIQWEB, NOMEIMPETIQWEB, NOMEJOBNFSE,
        INDUSUARIOFTPBALANCA, DIRETIMPORTADOS, DIRETREJEITADOS,
        SEQETIQUETALAYOUT, TIPOQUEBRALINHA, XMLTEMPLATERELETIQWEB,
        NOMEJOBMANIFESTACAOCTE,
        USUARIO_LOG, DATA_LOG
    ) VALUES (
        :OLD.NROEMPRESA, :OLD.SOFTPDV, :OLD.DIRETIMPORTARQUIVO, :OLD.DIRETEXPORTARQUIVO,
        :OLD.TIPOEXPORTACAO, :OLD.DIRETTEMP, :OLD.NOMEVIEW, :OLD.TIPOCARGA, :OLD.TIPOSOFT,
        :OLD.STATUS, :OLD.DTAALTERACAO, :OLD.USUALTERACAO, :OLD.DTAIMPORTEXPORT, :OLD.USUIMPORTEXPORT,
        :OLD.NROGONDOLA, :OLD.SEQEXPORTACAO, :OLD.DIRETDESTINO, :OLD.TIPODADOLINHA, :OLD.NROCARGAPDV,
        :OLD.INDCORTADIGBALANCA, :OLD.INDDESCBALANCA, :OLD.DIRETEXPORTARQPRECOPROMOC,
        :OLD.INDGERATXTNFE, :OLD.SUFIXO_ARQUIVO_EDI, :OLD.NOMEQRPETIQUETA, :OLD.QTDCOLUNASETIQ,
        :OLD.PREFIXO_ARQUIVO_EDI, :OLD.VERSAOLAYOUT, :OLD.NOMEJOBNFE, :OLD.NOMEJOBMDFE,
        :OLD.INDETIQWEB, :OLD.NOMEVIEWETIQWEB, :OLD.NOMEIMPETIQWEB, :OLD.NOMEJOBNFSE,
        :OLD.INDUSUARIOFTPBALANCA, :OLD.DIRETIMPORTADOS, :OLD.DIRETREJEITADOS,
        :OLD.SEQETIQUETALAYOUT, :OLD.TIPOQUEBRALINHA, :OLD.XMLTEMPLATERELETIQWEB,
        :OLD.NOMEJOBMANIFESTACAOCTE,
        V_USUALTERACAO, SYSDATE
    );
END;
/
```

---

## Consulta do Log

Identifica alterações por empresa e período — útil para rastrear quem mudou o IP (`DIRETIMPORTARQUIVO`):

```sql
SELECT X.NROEMPRESA,
       X.SOFTPDV,
       X.DIRETIMPORTARQUIVO      AS IP_ANTERIOR,
       X.NOMEVIEW,
       X.USUARIO_LOG,
       TO_CHAR(X.DATA_LOG, 'DD/MM/YY HH24:MI') AS DATA_LOG
  FROM NAGT_MRL_EMPSOFTPDV_LOG X
 WHERE TRUNC(X.DATA_LOG) BETWEEN :DT1 AND :DT2
   AND NROEMPRESA = :LS1;
```

> `IP_ANTERIOR` = valor de `DIRETIMPORTARQUIVO` antes da alteração. O valor atual está em `MRL_EMPSOFTPDV`.

---

## Pontos de Atenção

> [!warning] Cobertura da trigger
> A trigger captura qualquer `UPDATE` em `MRL_EMPSOFTPDV` — tanto pelo [[ERP]] quanto por scripts diretos no banco. O `USUARIO_LOG` revela a origem: usuário da aplicação vs. usuário Oracle do DBA/script.

> [!tip] View de restrição
> Solução complementar: criar uma **view** expondo apenas as colunas que o time de suporte pode editar, removendo o campo de IP da interface. O acesso à tabela base fica restrito ao schema Oracle — a edição pelo ERP passa obrigatoriamente pelo caminho correto.
