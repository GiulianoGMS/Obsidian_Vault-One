---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[PDV]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[Monitor PDV]]"
Open Tags:
  - "[[SAT]]"
  - "[[XML]]"
  - "[[NFe]]"
Date: 2026-06-03
Type: "[[Job]]"
tags:
  - Paliativos
---
[Objeto no GitHub →](https://github.com/GiulianoGMS/Loops/blob/main/FL_IndPresPDV.sql)

**Contexto:** Documentos emitidos no [[PDV]] ([[SAT]]/CF-e) com o campo `<indPres>` setado incorretamente como `4` (operação não presencial — internet) ao invés de `1` (operação presencial no estabelecimento). A SEFAZ rejeita com **código 217** e o documento fica sem protocolo de envio. **Problema nas emissões em contingencia.**

---

**Rejeição: Código 217 — indPres inválido**

- [[Job]]: `MONITORPDV.NAGJ_PALIAT_INDPRES_PDV`
- Objeto: [FL_IndPresPDV.sql](https://github.com/GiulianoGMS/Loops/blob/main/FL_IndPresPDV.sql)
- Função: Substitui `<indPres>4</indPres>` por `<indPres>1</indPres>` no XML do documento em `tb_doctonfexml`, permitindo o reenvio automático
- Escopo: documentos do dia (`TRUNC(SYSDATE)`) sem protocolo de envio (`protocoloenvio IS NULL`) e com `CODRETORNO = 217`
- Controle de idempotência: só processa documentos ausentes em `NAGT_DOCTONFE_INDPRES_LOG` — evita reprocessamento indevido

**Tabela de Log**

Cada documento corrigido é registrado em `monitorpdv.NAGT_DOCTONFE_INDPRES_LOG` (SYSDATE, NROEMPRESA, SEQDOCTO, NROCHECKOUT) antes do COMMIT.
