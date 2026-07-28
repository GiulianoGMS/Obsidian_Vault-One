---
Language:
  - "[[Oracle SQL]]"
Repository:
  - "[[Oracle_Auto_Reports]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PDV]]"
Open Tags:
  - "[[Monitoramento]]"
  - "[[Alertas]]"
  - "[[PDV]]"
  - "[[KPI]]"
Date: 2026-07-24
Type: Project
---

> [!info] Contexto
> KPIs de análise da tabela `NAGT_CONTROLECARGAPDV`, alimentada pelo alerta [[Oracle Auto Reports - Whatsapp Bot#Alertas (prefixo `NAGP_WTS_V2_`)|NAGP_WTS_V2_CONTROLECARGA_PDV_CTD]]. Cada registro representa uma falha de carga [[PDV]] (status 3 ou 4) detectada pelo bot de monitoramento.

```sql
ALTER SESSION SET CURRENT_SCHEMA = CONSINCO;
```

---

## 1 — Ranking de Lojas com Mais Alertas

Quais lojas apresentam mais ocorrências, quantos checkouts foram afetados e quantas tabelas diferentes falharam.

```sql
SELECT NROEMPRESA,
       COUNT(*)                    QTD_ALERTAS,
       COUNT(DISTINCT NROCHECKOUT) CHECKOUTS_AFETADOS,
       COUNT(DISTINCT TABELA)      TABELAS_AFETADAS
FROM NAGT_CONTROLECARGAPDV
GROUP BY NROEMPRESA
ORDER BY QTD_ALERTAS DESC;
```

---

## 2 — Ranking dos Checkouts Mais Problemáticos

Checkouts com maior reincidência de falhas.

```sql
SELECT NROEMPRESA,
       NROCHECKOUT,
       COUNT(*) QTD_ALERTAS
FROM NAGT_CONTROLECARGAPDV
GROUP BY NROEMPRESA, NROCHECKOUT
ORDER BY QTD_ALERTAS DESC;
```

---

## 3 — Ranking das Tabelas com Mais Falhas

Quais integrações são as maiores responsáveis pelos alertas.

```sql
SELECT TABELA,
       COUNT(*)                    QTD_ALERTAS,
       COUNT(DISTINCT NROEMPRESA)  LOJAS,
       COUNT(DISTINCT NROCHECKOUT) CHECKOUTS
FROM NAGT_CONTROLECARGAPDV
GROUP BY TABELA
ORDER BY QTD_ALERTAS DESC;
```

---

## 4 — Horários com Maior Incidência

Em quais horas do dia ocorrem mais problemas.

```sql
SELECT TO_CHAR(DTAHOREMISSAO, 'HH24') HORA,
       COUNT(*) QTD
FROM NAGT_CONTROLECARGAPDV
GROUP BY TO_CHAR(DTAHOREMISSAO, 'HH24')
ORDER BY QTD DESC;
```

---

## 5 — Dias da Semana com Maior Incidência

Se existe concentração de falhas em determinados dias.

```sql
SELECT TO_CHAR(DTAHOREMISSAO,
               'DAY',
               'NLS_DATE_LANGUAGE=PORTUGUESE') DIA,
       COUNT(*) QTD
FROM NAGT_CONTROLECARGAPDV
GROUP BY TO_CHAR(DTAHOREMISSAO,
                 'DAY',
                 'NLS_DATE_LANGUAGE=PORTUGUESE')
ORDER BY QTD DESC;
```

---

## 6 — Evolução Diária dos Alertas

Se o volume de falhas está aumentando ou diminuindo ao longo dos dias.

```sql
SELECT TRUNC(DTAHOREMISSAO) DIA,
       COUNT(*) ALERTAS
FROM NAGT_CONTROLECARGAPDV
GROUP BY TRUNC(DTAHOREMISSAO)
ORDER BY DIA;
```

---

## 7 — Falhas por Loja e Tabela

Quais tabelas mais impactam cada loja.

```sql
SELECT NROEMPRESA,
       TABELA,
       COUNT(*) QTD
FROM NAGT_CONTROLECARGAPDV
GROUP BY NROEMPRESA, TABELA
ORDER BY QTD DESC;
```

---

## 8 — Top 20 Ofensores

Combinações Loja + Checkout + Tabela + Status que mais geraram alertas.

```sql
SELECT NROEMPRESA,
       NROCHECKOUT,
       TABELA,
       STATUS,
       COUNT(*) QTD
FROM NAGT_CONTROLECARGAPDV
GROUP BY NROEMPRESA,
         NROCHECKOUT,
         TABELA,
         STATUS
ORDER BY QTD DESC
FETCH FIRST 20 ROWS ONLY;
```

---

## 9 — Heatmap Loja × Hora

Em quais horários cada loja apresenta maior volume de falhas.

```sql
SELECT NROEMPRESA,
       TO_CHAR(DTAHOREMISSAO, 'HH24') HORA,
       COUNT(*) QTD
FROM NAGT_CONTROLECARGAPDV
GROUP BY NROEMPRESA,
         TO_CHAR(DTAHOREMISSAO, 'HH24')
ORDER BY NROEMPRESA,
         HORA;
```

---

## 10 — Participação por Tabela (%)

Quanto cada tabela representa do total de alertas registrados.

```sql
SELECT TABELA,
       COUNT(*) QTD,
       ROUND(
           COUNT(*) * 100 /
           SUM(COUNT(*)) OVER(),
           2
       ) PERCENTUAL
FROM NAGT_CONTROLECARGAPDV
GROUP BY TABELA
ORDER BY QTD DESC;
```
