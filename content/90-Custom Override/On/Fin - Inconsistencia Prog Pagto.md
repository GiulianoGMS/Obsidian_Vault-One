---
Language:
  - "[[SQL]]"
Repository:
  - "[[DQL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[50-Meetings/Financeiro|Financeiro]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[ERP]]"
Open Tags:
  - "[[Titulo]]"
Date: 2026-08-31
Type: "[[Function]]"
Project:
tags:
  - reapply
  - custom_override
Aplicado 26..017: true
---
**Objetivo**

Validar o título na aplicação de Progamação de Pagamento se o mesmo encontra-se com a ultima ocorrência como cancelado. Por não filtrar a ultima operação os usuários reenviam para pagamento mesmo sem qualquer ajuste devido realizado no título.

**Aplicação com inconsistência:**

![[Pasted image 20260831121016.png]]

Aplicada na [[Function]]: **FIF_VALIDACAOPROGPGTOCUST**

**Regras de validação**

A função avalia sempre a **última ocorrência** do título (`FI_MOVOCOR`, ordenada por `DTAALTERACAO DESC`) e retorna a mensagem de inconsistência quando **todas** as condições abaixo são atendidas:

1. A última ocorrência foi gerada por rotina automática — `USUALTERACAO LIKE '%JOB%'`; e
2. A observação indica cancelamento/rejeição/desprogramação — `OBSERVACAO` contém `CANC`, `REJEI` ou `DESPRO`; e
3. O título **não** possui liberação de critério de programação — `NOT EXISTS` em `NAGT_LIB_CRIT_PROG` (join com `FI_TITULO` por `NROEMPRESA` + `NROTITULO`).

Caso contrário retorna `OK` (string vazia, sem bloqueio).

**Histórico de alterações**

- Filtro passou a considerar apenas ocorrências de origem automática (`USUALTERACAO LIKE '%JOB%'`).
- Ampliadas as situações de inconsistência: além de `CANC`, agora também `REJEI` (rejeitado) e `DESPRO` (desprogramado).
- Adicionado `INNER JOIN FI_TITULO` e cláusula `NOT EXISTS` sobre `NAGT_LIB_CRIT_PROG`, para não bloquear títulos já liberados por critério de programação.

Function:

```sql
CREATE OR REPLACE FUNCTION FIF_VALIDACAOPROGPGTOCUST(pObj IN PKG_FIPROGPGTO.TP_FI_VALIDACAOPROGPGTO)
RETURN VARCHAR2
IS

  Retorno VARCHAR2(4000);
  
BEGIN
  /*Função para ser utilizada pela customização para criar mensagens de Alerta/Erro para ser exibido no Título durante a programação de pagamento FIPROGPGTO.
    Deve retornar o contéudo da string entre os sinais <>.
    Pode retornar mais de uma msg por tipo.
    Ex.:
    <Mensagem 1><Mensagem 2>
  */
  
  SELECT CASE
           WHEN USUALTERACAO LIKE '%JOB%' AND 
               (UPPER(OBSERVACAO) LIKE '%CANC%' 
             OR UPPER(OBSERVACAO) LIKE '%REJEI%'
             OR UPPER(OBSERVACAO) LIKE '%DESPRO%')
            THEN '<Título Inconsistente, progamação retornada!>'
           ELSE 'OK'
         END AS STATUS
    INTO Retorno
    FROM (
        SELECT X.*,
               ROW_NUMBER() OVER (
                   PARTITION BY X.SEQIDENTIFICA
                   ORDER BY X.DTAALTERACAO DESC
               ) AS RN
        FROM FI_MOVOCOR X INNER JOIN FI_TITULO F ON F.SEQTITULO = X.SEQIDENTIFICA
        WHERE X.SEQIDENTIFICA =  pObj.cnSEQTITULO
          AND NOT EXISTS (SELECT 1 FROM NAGT_LIB_CRIT_PROG XX WHERE XX.NROEMPRESA = F.NROEMPRESA AND XX.NROTITULO = F.NROTITULO)
    )
    WHERE RN = 1 AND 1=1;
  
  IF  Retorno = 'OK' THEN
    RETURN '';
  ELSE
  RETURN Retorno;
  
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN '';
END FIF_VALIDACAOPROGPGTOCUST;

```

---

**Procedure de liberação: NAGP_LIB_PROG_FIN**

Procedure complementar responsável por **liberar** um título do critério de programação, gravando um registro na tabela `NAGT_LIB_CRIT_PROG`. É justamente esse registro que faz a function **FIF_VALIDACAOPROGPGTOCUST** ignorar o título (cláusula `NOT EXISTS`), permitindo que ele siga na programação de pagamento mesmo com a última ocorrência inconsistente.

Parâmetros:
- `psNroEmpresa` — número da empresa do título.
- `psNroTitulo` — número do título a ser liberado.

O usuário responsável pela liberação é capturado via `SYS_CONTEXT('USERENV','CLIENT_IDENTIFIER')` e gravado junto com a data (`SYSDATE`) para rastreabilidade.

Procedure:

```sql
CREATE OR REPLACE PROCEDURE NAGP_LIB_PROG_FIN (psNroEmpresa NUMBER, psNroTitulo NUMBER)
  IS
  psUsuarioLiberacao VARCHAR2(4000);
  BEGIN
    SELECT SYS_CONTEXT ('USERENV','CLIENT_IDENTIFIER')
      INTO psUsuarioLiberacao
      FROM DUAL;
    INSERT INTO NAGT_LIB_CRIT_PROG VALUES (psNroEmpresa, psNroTitulo, SYSDATE, psUsuarioLiberacao);
    COMMIT;
  END;
```

> [!info] Talvez, necessário reaplicar em troca de versão, nunca utilizado a function customizada antes
