---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[30-Squad/Financeiro]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[DDA]]"
  - "[[Boleto]]"
  - "[[Critica]]"
  - "[[30-Squad/Financeiro]]"
  - "[[Titulo]]"
Date: 2026-08-30
Type: "[[Package]]"
Project:
tags:
  - custom_override
  - reapply
GLPI: 735391
---
> [!info] Referência
> Repositório: [GiulianoGMS/DDL-Objects-Oracle — NAGF_STATUS_TIT_FIN.fnc](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_STATUS_TIT_FIN.fnc)
> GLPI: **735391** — [Ticket 735391](https://glpi.nagumo.com.br/front/ticket.form.php?id=735391)

---
### Visão Geral

Customização na `PKG_FIDDA`, responsável pelo processamento e vínculo de arquivos/boletos **DDA** (Débito Direto Autorizado) aos títulos financeiros. O problema reportado no **GLPI 735391** era que o sistema permitia vincular um arquivo/boleto [[DDA]] a títulos que **já estavam autorizados para pagamento**, gerando risco de duplicidade ou reprocessamento indevido de um [[título]] já liberado.

A correção adiciona uma **crítica** ([[inconsistência]]) que impede o vínculo do código de barras quando o título já possui autorização de pagamento, utilizando a [[Function]] `NAGF_STATUS_TIT_FIN` para identificar essa condição.

---
### Problema

Durante a busca/vínculo do [[DDA]] (`SP_CONSISTETITULO` dentro da `PKG_FIDDA`), o sistema associava o código de barras ao título sem verificar se o mesmo já se encontrava **autorizado para pagamento** na tabela `FI_AUTPAGTO`.

Como consequência, era possível vincular um boleto [[DDA]] a um título já liberado no fluxo de pagamento — situação que deve ser barrada e sinalizada como [[inconsistência]] para tratamento manual.

---
### Solução

Alterada a `PKG_FIDDA`, na procedure **`SP_CONSISTETITULO`**, incluindo uma crítica que:

1. Verifica, via `NAGF_STATUS_TIT_FIN(pnSeqTitulo)`, se o título já possui autorização de pagamento.
2. Caso positivo (retorno `= 1`), grava uma inconsistência do tipo `'D'` na tabela `FIX_BUSCADDA`, impedindo o prosseguimento normal do vínculo.
### Trecho inserido

```sql
  -- Giuliano 30/08/26
    -- Critica tit ja autorizado
    IF NAGF_STATUS_TIT_FIN(pnSeqTitulo) = 1 THEN

       INSERT INTO FIX_BUSCADDA
          (TIPO,
           SEQTITULO,
           NROPROCESSO,
           CODBARRAS,
           TIPOINCONSISTENCIA,
           INCONSISTENCIA,
           VALOR)
        VALUES
          ('I',
           pnSeqTitulo,
           pnNroProcesso,
           vsCodBarras,
           'D',
           'Este título encontra-se autorizado para pagamento',
           vnVlrCodBarras);
     END IF;
```

---
### Função de apoio — `NAGF_STATUS_TIT_FIN`

A regra da crítica se apoia na função `NAGF_STATUS_TIT_FIN`, que verifica se o título possui registro de autorização de pagamento.

```sql
CREATE OR REPLACE FUNCTION NAGF_STATUS_TIT_FIN (psSeqTITULO NUMBER)
  RETURN NUMBER IS
   psTitAut     NUMBER(10);
  BEGIN
   SELECT COUNT(1)
     INTO psTitAut
     FROM FI_AUTPAGTO X
    WHERE X.SEQTITULO = psSeqTitulo
      AND 1=1;
RETURN psTitAut;
END;
```

[[Function]] disponível no [Github](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_STATUS_TIT_FIN.fnc).
### Como funciona

| Item              | Descrição                                                                               |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Parâmetro**     | `psSeqTitulo` (`NUMBER`) — sequencial do título financeiro a validar                    |
| **Fonte**         | Tabela `FI_AUTPAGTO` — autorizações de pagamento                                        |
| **Retorno**       | `NUMBER` — quantidade de registros de autorização encontrados para o título             |
| **Interpretação** | `> 0` (na crítica, `= 1`) → título **autorizado** para pagamento; `0` → sem autorização |

> [!note] Sobre o retorno
> A função retorna um `COUNT(1)`. Na crítica utiliza-se `= 1` como condição de título autorizado. Caso haja possibilidade de múltiplas autorizações por título, avaliar o uso de `>= 1` para robustez.

---
### Detalhamento da crítica

| Coluna gravada em `FIX_BUSCADDA` | Valor | Significado |
|----------------------------------|-------|-------------|
| `TIPO` | `'I'` | Registro de **inconsistência** |
| `SEQTITULO` | `pnSeqTitulo` | Título que gerou a crítica |
| `NROPROCESSO` | `pnNroProcesso` | Processo de importação/busca DDA em andamento |
| `CODBARRAS` | `vsCodBarras` | Código de barras do boleto DDA que se tentou vincular |
| `TIPOINCONSISTENCIA` | `'D'` | Tipo da inconsistência (título autorizado) |
| `INCONSISTENCIA` | `'Este título encontra-se autorizado para pagamento'` | Mensagem exibida ao usuário |
| `VALOR` | `vnVlrCodBarras` | Valor do código de barras/boleto |

**Fluxo lógico:**

1. `SP_CONSISTETITULO` processa o título/código de barras DDA.
2. Antes de concluir o vínculo, chama `NAGF_STATUS_TIT_FIN(pnSeqTitulo)`.
3. Se o retorno for `1` (título autorizado) → grava inconsistência `'D'` em `FIX_BUSCADDA` e o vínculo é barrado/sinalizado.
4. Se o retorno for `0` (sem autorização) → segue o fluxo normal de vínculo do DDA.

---
### Objetos de Banco Utilizados

| Objeto                | Tipo      | Finalidade                                             |
| --------------------- | --------- | ------------------------------------------------------ |
| `PKG_FIDDA`           | Package   | Processamento/vínculo de arquivos e boletos DDA        |
| `SP_CONSISTETITULO`   | Procedure | Rotina onde a crítica foi inserida                     |
| `NAGF_STATUS_TIT_FIN` | Function  | Verifica se o título já está autorizado para pagamento |
| `FI_AUTPAGTO`         | Tabela    | Autorizações de pagamento de títulos financeiros       |
| `FIX_BUSCADDA`        | Tabela    | Armazena inconsistências/registros da busca DDA        |

---
### Notas

> [!warning] Objeto oficial — reaplicar após versão
> A `PKG_FIDDA` é um objeto oficial do [[PLSQL-ERP-Consinco]]. As alterações são perdidas após trocas de [[versão]], logo é necessário **reaplicar** o ajuste novamente. A function `NAGF_STATUS_TIT_FIN` é objeto próprio ([[custom_override]]) e não é sobrescrita pela versão.
