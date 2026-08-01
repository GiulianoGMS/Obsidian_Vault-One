---
Language:
  - "[[Oracle SQL]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[ERP]]"
Open Tags:
  - "[[NFSe]]"
  - "[[Fiscal]]"
Date: 2026-08-01
Type: "[[Procedure]]"
---

> [!info] Contexto
> Procedimento manual para desbloquear [[NFS-e]] presa no status **Aguardando Retorno** — situação em que a nota foi enviada mas não recebeu resposta conclusiva da prefeitura. O fluxo força um reenvio duplo: o primeiro retorna rejeição vazia e o segundo autoriza.

> [!warning] Atenção
> Substituir `1147` pelo **número da NF** e ajustar os filtros de data conforme necessário antes de executar.

---

## Passo a Passo

### 1 — Localizar e corrigir o registro na TBINTEGRATION

Alterar `DOCSTATUS = 0` e `DOCKIND = 1`.

```sql
SELECT ROWID, X.*
FROM TBINTEGRATION X
WHERE X.RPSNUMBER IN (1147)
  AND X.INSERTDATE >= SYSDATE - 50;
```

> Após identificar o registro: atualizar `DOCSTATUS = 0` e `DOCKIND = 1`.

---

### 2 — Alterar o STATUSNFE para 99

```sql
SELECT STATUSNFE, ROWID
FROM MLF_NOTAFISCAL X
WHERE NUMERONF     = 1147
  AND CODGERALOPER = 11
  AND X.DTAEMISSAO > SYSDATE - 40;
```

> Após identificar o registro: atualizar `STATUSNFE = 99`.

---

### 3 — Primeiro reenvio

Reenviar a nota pelo ERP — vai retornar **rejeição vazia**.

---

### 4 — Segundo reenvio

Reenviar novamente — a nota será **autorizada**.
