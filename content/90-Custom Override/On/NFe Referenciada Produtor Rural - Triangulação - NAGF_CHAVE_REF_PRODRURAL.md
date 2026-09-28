---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Fiscal]]"
  - "[[Recebimento]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[NFref]]"
  - "[[Produtor Rural]]"
  - "[[Triangulação]]"
Date: 2026-09-28
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
  - paliativo
---
**Contexto**: Após a ativação da **NT 2025.002 v1.40**, a NF-e passou a referenciar a nota fiscal (chave de acesso) **item a item** através da tag [[NFref]]. Para o cenário de **Produtor Rural** com **triangulação**, a nota estava sendo emitida referenciando a **nossa chave de acesso**, ao invés da chave do **fornecedor (produtor rural)**.

Isso resultava na rejeição da SEFAZ:

> **Rejeição: Destinatário da NF-e deve ser igual ao Emitente da NF referenciada**

Como o emitente da NF referenciada deve ser o produtor rural (fornecedor) e não a nossa empresa, a validação da SEFAZ falhava porque a chave referenciada apontava para a nossa emissão.

---

## Solução Paliativa

Foi criada a [[Function]] [NAGF_CHAVE_REF_PRODRURAL](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_CHAVE_REF_PRODRURAL.fnc) para retornar a **chave de acesso correta da NF referenciada** (a do produtor rural), substituindo a chave incorreta.

A function busca em `MLF_NOTAFISCAL` a `NFEREFERENCIACHAVE` para a chave de acesso informada, filtrando apenas pessoas marcadas como produtor rural (`GE_PESSOA.INDPRODRURAL = 'S'`).

[[Function]]:

```sql
CREATE OR REPLACE FUNCTION NAGF_CHAVE_REF_PRODRURAL (psChaveAcesso VARCHAR2)

  RETURN VARCHAR2 IS
   retornoChaveAcesso VARCHAR2(444);

  BEGIN

   SELECT MAX(X.NFEREFERENCIACHAVE)
     INTO retornoChaveAcesso
     FROM MLF_NOTAFISCAL X INNER JOIN GE_PESSOA G ON G.SEQPESSOA = X.SEQPESSOA

    WHERE X.NFECHAVEACESSO = psChaveAcesso
      AND G.INDPRODRURAL = 'S';

RETURN retornoChaveAcesso;

END;
```

---

## Aplicação

Aplicado na [[Procedure]] / PKG **SP_GERAARQENVIONDDIGITALNFE2g**, na **linha 3125**, envolvendo o valor da chave referenciada com `NVL` para usar a chave do produtor rural quando aplicável:

```sql
fc5_BuscaCampoNotaTecnica(NVL(NVL(NAGF_CHAVE_REF_PRODRURAL(a.M014_DS_CHAVEACESSOREF)
```

A lógica com `NVL` garante que:
1. Se `NAGF_CHAVE_REF_PRODRURAL` retornar a chave do produtor rural → usa essa chave.
2. Caso contrário → mantém o valor original (`a.M014_DS_CHAVEACESSOREF`).

---

## Regras

- A function só retorna chave quando a pessoa (`GE_PESSOA`) estiver marcada como **produtor rural** (`INDPRODRURAL = 'S'`).
- Aplica-se ao cenário de **triangulação** com produtor rural, onde o emitente da NF referenciada deve ser o fornecedor.

> ⚠️ **Paliativo**: Por ser aplicado sobre um objeto oficial da [[TOTVS]] (**SP_GERAARQENVIONDDIGITALNFE2g**), o ajuste **precisa ser reaplicado após atualizações de versão**.
