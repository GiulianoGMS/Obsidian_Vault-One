---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Recebimento]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[NFe]]"
Date: 2026-06-16
Type: "[[Loop]]"
Project:
tags:
---
**Contexto**: A versão para 26..01.017 contempla tabelas reconfiguradas como **VARCHAR2** nos campos de CNPJ para adequação ao novo padrão de [[CNPJ ALFANUMÉRICO]].

Todas views/objetos que compararem campos **NUMBER** vs **VARCHAR2** (devido a mudança) precisarão ser ajustados, caso contrário retornarão **Error Invalid Number.**

No cenário abaixo as notas estavam sendo importadas, porém, durante a validação de críticas através da view **MLFV_AUXNOTAFISCALINCONS** (Customizada internamente), retornava erro **invalid number** pois a mesma estava validando o CNPJ (number vs varchar2) em algumas validações antigas.

Após corrigir a validação da view para **VARCHAR2**, houve a necessidade de excluir as notas importadas e executar a rotina de importação novamente, pois caso contrário ocorria o erro de **Unique Constraint**:

![[Pasted image 20260616081214.png|697]]

#### Bloco do Loop criado para atender o cenário:
```sql
BEGIN
  -- Para cada nota importada
  FOR seq IN (SELECT SEQAUXNOTAFISCAL psSeqAuxNF, CHAVE_ACESSO FROM MRL_NFEIMPPROCESS A 
               LEFT JOIN MLF_AUXNOTAFISCAL B ON A.CHAVE_ACESSO = B.NFECHAVEACESSO)
    LOOP
    -- Exclui a importacao em todas tabelas
    DELETE FROM CONSINCO.MLF_AUXNFITEM              WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_AUXNFVENCIMENTO        WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_AUXNFVENCIMENTOCONSIST WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_AUXNFINCONSISTENCIA    WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_NFITEMLOTE             WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_CONHECIMENTONOTAS      WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_SERVICONOTAS           WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_GNRE                   WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_AUXNFVENCTITDIREITO    WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    DELETE FROM CONSINCO.MLF_AUXNOTAFISCAL          WHERE SEQAUXNOTAFISCAL = seq.psSeqAuxNF;
    
    DELETE FROM MRL_NFEIMPPROCESS I WHERE I.CHAVE_ACESSO = seq.CHAVE_ACESSO;
   
    COMMIT;
    
    END LOOP;
    
    -- Executa a rotina de importacao novamente
  
    FOR X IN (
                 SELECT A.NROEMPRESA
                 FROM DWNAGT_DADOSEMPRESA@BI A
                 WHERE A.TIPO in ('LOJA','CD')
                 AND A.NROEMPRESA NOT IN (502,504,505)
                 order by 1
                 )                 
               LOOP
      CONSINCO.SP_GERARECEBTOXMLAUTO(X.NROEMPRESA);
      
      COMMIT;

    END LOOP; 
    
END;
```

Notas corrigidas.