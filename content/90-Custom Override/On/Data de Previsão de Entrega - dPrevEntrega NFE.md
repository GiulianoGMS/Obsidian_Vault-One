---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Recebimento]]"
  - "[[Expedição]]"
  - "[[Fiscal]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[XML]]"
  - "[[Tags]]"
Date:
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**: Necessário emissão da tag dPrevEntrega no XML quando o modelo de frete não for 0,1,4,9

Para atender a necessidade, foi criado a [[Function]] [NAGF_BUSCA_MOD_FRETE](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_ALIQ_ICMSDESON.fnc) e aplicado na procedure de montagem do XML - **SP_GERAARQENVIONDDIGITALNFE2g** 

[[Function]]: 

```sql
CREATE OR REPLACE FUNCTION NAGF_BUSCA_MODFRETE (psChaveNF VARCHAR2)

RETURN NUMBER IS 
  psModFrete NUMBER;
  
 BEGIN

  SELECT MAX(NVL(fBuscaTipoFreteTransp(A.SEQNOTAFISCAL,A.NROCARGA,A.NROEMPRESA,A.TIPOFRETE,A.SEQTRANSPORTADOR),0))
    INTO psModFrete
    FROM MFLV_BASENF A
   WHERE A.nfechaveacesso = psChaveNF;

 RETURN psModFrete;
 
 END;

```

Adicionado na linha 501 da [[Procedure]] **SP_GERAARQENVIONDDIGITALNFE2g**

```sql
CASE WHEN NAGF_BUSCA_MODFRETE(A.M000_NR_CHAVE_ACESSO) NOT IN (0,1,4,9) THEN
           fc5_BuscaCampoNotaTecnica(to_char(NVL(vdDtaHorEmissao + 1,a.M000_DT_DTAPREVENTREGA), 'yyyy-MM-dd'), 2025002, pnNroEmpresa, 4, 1.30, 116, vdDtaHorEmissao) END , -- dPrevEntrega
```

Por ser um objeto oficial, é necessário reaplicar os ajustes após atualizações de versão.