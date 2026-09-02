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
           WHEN UPPER(OBSERVACAO) LIKE '%CANC%' THEN '<Título Inconsistente, progamação retornada!>'
           ELSE 'OK'
         END AS STATUS
    INTO Retorno
    FROM (
        SELECT X.*,
               ROW_NUMBER() OVER (
                   PARTITION BY X.SEQIDENTIFICA
                   ORDER BY X.DTAALTERACAO DESC
               ) AS RN
        FROM FI_MOVOCOR X
        WHERE X.SEQIDENTIFICA =  pObj.cnSEQTITULO
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
> [!info] Talvez, necessário reaplicar em troca de versão, nunca utilizado a function customizada antes
