---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Fiscal]]"
  - "[[Tributação]]"
  - "[[Validação]]"
  - "[[IPI]]"
  - "[[ST]]"
Date: 2026-07-02
Type: Ferramenta
---

> [!info] Referência
> Repositório: [GiulianoGMS/DDL-Objects-Oracle — NAGV_MASTER_VALID_CADASTROS.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGV_MASTER_VALID_CADASTROS.sql)

---

## Visão Geral

View de validação de cadastro fiscal de produtos. Retorna **um produto por linha** com todas as inconsistências encontradas concatenadas e separadas por ` | `.

Exclui famílias com `FINALIDADEFAMILIA = 'P'`.

**Colunas retornadas:**

| Coluna | Fonte |
|--------|-------|
| `PLU` | `MAP_PRODUTO.SEQPRODUTO` |
| `COD_FAMILIA` | `MAP_PRODUTO.SEQFAMILIA` |
| `DESC_PRODUTO` | `MAP_PRODUTO.DESCCOMPLETA` |
| `INCONSISTENCIAS` | Concatenação de INC1…INC22 separadas por ` \| ` |

---

## Inconsistências

> [!note] Inativas
> INC1, INC3 e INC17 foram desativadas em 21/01 via `AND 1=2` (Ticket 680964). Estão documentadas mas não disparam.

---

### INC1 — Sem fleg Participa Controle Estoque ST *(inativa)*

**Regra:** família sem `INDMERCENQUADST = 'S'` em `MAP_FAMDIVISAO`.
**Status:** desativada (Ticket 680964).

---

### INC2 — Sem NCM e CST PIS/COFINS

**Regra:** família com qualquer um dos campos abaixo nulo em `MAP_FAMILIA`:

| Campo | Significado |
|-------|-------------|
| `CODNBMSH` | NCM do produto |
| `SITUACAONFPIS` | CST PIS entrada |
| `SITUACAONFCOFINS` | CST COFINS entrada |
| `SITUACAONFIPISAI` | CST PIS saída |
| `SITUACAONFCOFINSSAI` | CST COFINS saída |

---

### INC3 — Sem EAN com fleg "EAN TRIB DANFE" *(inativa)*

**Regra:** produto com EAN (`TIPCODIGO='E'`) sem `INDEANTRIBNFE='S'`.
**Status:** desativada (Ticket 680964).

---

### INC4 — CST IPI Saída diferente de 50/53

**Regra:** `MAP_FAMILIA.SITUACAONFIPISAI NOT IN (50, 53)`.

Os únicos CSTs de IPI válidos para saída são:
- **50** — Saída com recuperação de crédito
- **53** — Saída não tributada

---

### INC5 — IMP/IM com origem NAC

**Regra:** tributação cujo nome contém `%IMP%` ou começa com `IM%` mas o `CODORIGEMTRIB` **não** é de importação (`NOT IN (1,2,3,6,7,8)`).

Indica divergência entre o nome da tributação (sugere importado) e a origem cadastrada (nacional).
Exceção: tributações `%LIMP%` têm tratamento próprio.

Fonte: `MAP_FAMDIVISAO JOIN MAP_TRIBUTACAO`.

---

### INC6 — NAC com origem IMP

**Regra:** inverso do INC5. Tributação sem `%IMP%` e sem `IM%` no nome mas `CODORIGEMTRIB NOT IN (0,4,5,7)`.

Indica nome nacional com origem cadastrada como importada.

---

### INC7 — (EX) Alíquota = 0 e CST IPI diferente de 03

**Aplica-se a:** produtos com fornecedor principal `UF = 'EX'` (importado).

**Regra:** se `ALIQUOTAIPI = 0`, o CST IPI deve ser `'03'` (isento). Caso contrário → inconsistência.

Fonte: `MAP_PRODUTO JOIN MAP_FAMILIA JOIN MAP_FAMFORNEC JOIN GE_PESSOA`.

---

### INC8 — (EX) Alíquota > 0 e CST IPI diferente de 00

**Aplica-se a:** produtos com fornecedor principal `UF = 'EX'`.

**Regra:** se `ALIQUOTAIPI > 0`, o CST IPI deve ser `'00'` (tributado integralmente). Caso contrário → inconsistência.

---

### INC9 — Família sem fleg "Usa Dados do Regime CGO quando existe"

**Regra:** `MAP_FAMDIVISAO.INDUSADADOSREGCGO IS NULL` ou `= 'N'`.

Todos os produtos devem ter este flag ativo (`'S'`) para que o regime CGO seja considerado nos cálculos.

---

### INC10 — (EX) PIS/COFINS nulo ou igual a 1,65/7,60

**Aplica-se a:** produtos de importação direta (`NROREGTRIBUTACAO = 8`) com fornecedor `UF = 'EX'`.

**Regra:** para esse regime, as alíquotas corretas são **PIS 2,10%** e **COFINS 9,65%**. Valores `1,65%` / `7,60%` são os antigos e indicam cadastro desatualizado.

Não dispara se CST PIS/COFINS for `70` ou `73`.

Fonte: `MAP_FAMDIVISAO JOIN MAP_FAMFORNEC JOIN MAP_TRIBUTACAOUF JOIN MAF_FORNECEDOR JOIN GE_PESSOA`.

---

### INC11 — (EX) Produto com entrada de IPI sem saída parametrizada

**Aplica-se a:** produtos com fornecedor `UF = 'EX'` e `ALIQUOTAIPI > 0`.

**Regra:** produto importado com IPI na entrada exige que os campos de **saída de IPI** estejam preenchidos em `MAP_FAMILIA`. Dispara se qualquer um for nulo/zero:

| Campo | Significado |
|-------|-------------|
| `PERISENTOIPI` | % isento de IPI na saída |
| `PEROUTROIPI` | % outros de IPI na saída |
| `PERALIQUOTAIPI` | Alíquota IPI saída |
| `PERBASEIPI` | % base IPI saída (deve ser > 0) |

---

### INC12 — (EX) Família EX sem parametrização de Indústria (Fornec 502/503)

**Aplica-se a:** famílias com fornecedor `502` ou `503` (fornecedores internos de importação direta) que também possuem fornecedor com `UF = 'EX'`.

**Regra:** o tipo do fornecedor na família (`TIPFORNECEDORFAM`) deve ser `'I'` (Indústria). Se não for → inconsistência.

---

### INC13 — (EX) Alíquota IPI diferente da regra por NCM

**Aplica-se a:** famílias com fornecedor `502` ou `503` que possuem fornecedor `UF = 'EX'`.

**Regra:** cruza o NCM (`CODNBMSH`) e a alíquota IPI da família com a tabela `NAGT_DEPARA_TICKET464111`. Se o NCM existe na tabela de regras mas a alíquota cadastrada na família for **diferente** da alíquota correta → inconsistência.

A mensagem exibe: `NCM | Alíquota cadastrada no C5 | Alíquota(s) correta(s) pela regra`.

---

### INC14 — Produto com parâmetros ST e CST diferente de 060/061/090

**Aplica-se a:** tributação de saída intraestadual (`TIPTRIBUTACAO = 'EI'`, UF empresa = UF cliente, SP ou RJ, regime 0).

**Regra:** se a família tem **parâmetros ST ativos** (`PERACRESCST > 0`, `PERALIQUOTAST > 0`, `PERTRIBUTST > 0`), o CST ICMS de saída (coluna SC) deve ser `060`, `061` ou `090`.

---

### INC15 — Produto sem parâmetros ST e CST diferente de 000/020/040/041/051/090

**Aplica-se a:** mesma tributação do INC14 (saída intraestadual, SP ou RJ, regime 0).

**Regra:** inverso do INC14. Sem parâmetros ST (tudo = 0), o CST ICMS de saída deve ser `000`, `020`, `040`, `041`, `051` ou `090`.

---

### INC16 — Família com redução de PIS/COFINS

**Regra:** `MAP_FAMILIA.PERBASEPIS > 0` ou `PERBASECOFINS > 0`.

Produto não deveria ter redução de base de PIS/COFINS parametrizada diretamente na família.

---

### INC17 — Produto sem fleg "Permite Multiplicação" *(inativa)*

**Regra:** `MAP_FAMILIA.PMTMULTIPLICACAO != 'S'` para famílias que não são `'R'` (remessa) ou `'P'` (paliativo).
**Status:** desativada (Ticket 680964).

---

### INC18 — Produto Trib. IMP com alíquota diferente de 4% (RJ)

**Aplica-se a:** produtos com tributação IMP (nome contém `%IMP%` ou `IM%`) e origem importada (`CODORIGEMTRIB IN (1,2,3,6,7,8)`).

**Regra:** na tributação de saída intraestadual (`SC`) para o **RJ** (regime 0): alíquota ICMS deve ser **4%** (alíquota interestadual de importados conforme Resolução SF 13/2012). Se `PERALIQUOTA != 4` → inconsistência.

*Adicionado em 24/02/2026 — Ticket 691854.*

---

### INC19 — Produto Trib. NAC com alíquota igual a 4% (RJ)

**Aplica-se a:** produtos nacionais (sem `%IM%` no nome, origem `IN (0,4,5,6)`).

**Regra:** inverso do INC18. Na tributação SC do **RJ**: alíquota de 4% é exclusiva de importados. Nacional com 4% → inconsistência.

Exceção: tributações `1` e `1187` não são verificadas.

---

### INC20 — Família/Trib sem cBenef parametrizado (Intraestadual)

**Aplica-se a:** tributações de saída intraestadual (`SC`, UF empresa = UF cliente, SP ou RJ, regime 0) com CST ICMS de **redução de base**: `020`, `030`, `040`, `041`, `050` ou `070`.

**Regra:** quando há redução de base de ICMS, o campo `cBenef` é obrigatório na NF-e. Dispara se qualquer um dos três campos abaixo faltar:

| Campo | Significado |
|-------|-------------|
| `INDCALCICMSDESONOUTROS` | Deve ser `'S'` |
| `CODAJUSTEINFAD` | Código de benefício fiscal |
| `MOTIVODESONERACAO` | Motivo da desoneração |

Exceção: tributações `1` e `1187` não são verificadas.

---

### INC21 — % Base FCP diferente do % Tributado (RJ)

**Aplica-se a:** tributação de saída intraestadual (`SN`) para o **RJ** com CST `020` (tributado parcialmente) e regime 0.

**Regra:** quando `PERTRIBUTADO != 100`, o campo `BASEFCPICMS` deve ser **igual** a `PERTRIBUTADO`. Divergência indica que a base do FCP não está alinhada com o percentual tributado.

---

### INC22 — Família/Trib sem cBenef parametrizado (Interestadual)

**Aplica-se a:** tributações de saída interestadual (`SC`, UF cliente ≠ UF empresa, mas ambas SP ou RJ, regime 0) com CST ICMS de redução: `020`, `030`, `040`, `041` ou `051`.

**Regra:** idêntica ao INC20 — `cBenef` obrigatório (`INDCALCICMSDESONOUTROS`, `CODAJUSTEINFAD`, `MOTIVODESONERACAO`).

Exceção: tributações `1` e `1187` não são verificadas.

---

## Resumo por Categoria

| Categoria | INC |
|-----------|-----|
| Cadastro básico da família (NCM, CST PIS/COFINS) | INC2 |
| CST IPI de saída | INC4, INC7, INC8 |
| Coerência tributação × origem (IMP/NAC) | INC5, INC6 |
| Flags obrigatórios da família | INC9, INC16 |
| Importados (EX) — PIS/COFINS, IPI e fornecedor | INC10, INC11, INC12, INC13 |
| ST × CST ICMS de saída | INC14, INC15 |
| cBenef (redução de base ICMS) | INC20, INC22 |
| Alíquota ICMS RJ (4% IMP vs NAC) | INC18, INC19 |
| FCP base vs tributado (RJ) | INC21 |
| Inativas (Ticket 680964) | INC1, INC3, INC17 |

---

## Objetos de Banco

| Objeto | Uso |
|--------|-----|
| `MAP_PRODUTO` | Base da iteração — um produto por linha |
| `MAP_FAMILIA` | NCM, CST PIS/COFINS, alíquota IPI, % base PIS/COFINS |
| `MAP_FAMDIVISAO` | Tributação, flags INDMERCENQUADST, INDUSADADOSREGCGO, FINALIDADEFAMILIA |
| `MAP_TRIBUTACAO` | Nome da tributação (para detectar IMP vs NAC) |
| `MAP_TRIBUTACAOUF` | Alíquotas e CST por UF, regime e tipo — source de INC14/15/18/19/20/21/22 |
| `MAP_FAMFORNEC` | Fornecedor principal da família e tipo (Indústria, etc.) |
| `GE_PESSOA` | UF do fornecedor (detecta `'EX'` = importado) |
| `MAP_PRODCODIGO` | Códigos EAN do produto |
| `NAGT_DEPARA_TICKET464111` | Tabela de regras de alíquota IPI por NCM (Ticket 464111) |
