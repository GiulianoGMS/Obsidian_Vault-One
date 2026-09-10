---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Comercial]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Lote de Compra]]"
  - "[[Trigger]]"
  - "[[Sugestão de Compra]]"
  - "[[Arredondamento]]"
Date: 2026-08-28
Type:
---

> [!info] Referência
> [GiulianoGMS/DDL-Objects-Oracle — NAGTRG_BI_MAC_GERCOMPRAITEM.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_BI_MAC_GERCOMPRAITEM.sql)
> [GiulianoGMS/DDL-Objects-Oracle — NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED.trg](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED.trg)

---

## Visão Geral

Dois comportamentos automáticos ativados no `INSERT` de `MAC_GERCOMPRAITEM`, ambos controlados pela mesma tabela de parametrização (`NAGT_COMP_FORN_SUGESTAUTO`), mas implementados em triggers distintos:

| Comportamento                     | Quando ativa                                                        | Trigger responsável                                          |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Acata Sugerido Automático**     | Parametrizações **sem** `CD_AGRUP`                                  | `NAGTRG_BI_MAC_GERCOMPRAITEM` (BEFORE INSERT)                |
| **Consolidação + Arredondamento** | Lote com **CD presente** (`NROEMPRESA BETWEEN 500 AND 599`) na `MAC_GERCOMPRAITEM` | `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` ([[COMPOUND TRIGGER]]) |

A coordenação é feita via `COUNT(X.CD_AGRUP)` no BEFORE INSERT. O CD de consolidação é detectado dinamicamente pelo COMPOUND TRIGGER como `MIN(NROEMPRESA BETWEEN 500 AND 599)` — sem dependência do valor armazenado em `CD_AGRUP`.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `MAC_GERCOMPRAITEM` | Tabela | Itens do lote de compra — alvo dos triggers |
| `MAC_GERCOMPRAFORN` | Tabela | Fornecedor do lote (`SEQFORNECEDOR`) |
| `MAC_GERCOMPRA` | Tabela | Cabeçalho do lote — `SEQCOMPRADOR`, `TIPOLOTE = 'C'` |
| `MAC_GERCOMPRAEMP` | Tabela | Empresas do lote — usada pelo BEFORE INSERT para detectar CD (`NROEMPRESA BETWEEN 500 AND 599`) sem risco de ORA-04091 |
| `NAGT_COMP_FORN_SUGESTAUTO` | Tabela | Parametrização central — controla ambos os comportamentos |
| `MRL_PRODEMPRESAWM` | Tabela | Parâmetros logísticos do produto: `PALETELASTRO`, `PALETEALTURA` |
| `MRL_PRODUTOEMPRESA` | Tabela | Fallback do percentual de arredondamento: `PERCVARIACAOSUG` |
| `TBIU_MAC_GERABASTECITEM` | Trigger | Trigger padrão do [[ERP]] — `NAGTRG_BI_MAC_GERCOMPRAITEM` executa depois (`FOLLOWS`) |
| `NAGTRG_BI_MAC_GERCOMPRAITEM` | Trigger (BEFORE INSERT) | Acata Sugerido Automático — só atua quando não há CD no lote |
| `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` | Trigger (COMPOUND) | Consolidação + Arredondamento — atua quando há CD (`BETWEEN 500 AND 599`) no lote |

---

## Tabela de Controle — `NAGT_COMP_FORN_SUGESTAUTO`

Tabela central que parametriza ambos os comportamentos. A presença ou ausência de `CD_AGRUP` define qual trigger atua.

| Campo | Tipo | Finalidade |
|---|---|---|
| `SEQCOMPRADOR` | NUMBER | [[Comprador]] do lote |
| `SEQFORNECEDOR` | NUMBER | [[Fornecedor]] específico; `NULL` = qualquer fornecedor |
| `CD_AGRUP` | NUMBER | Não utilizado pelos triggers para coordenação ou detecção do CD. Mantido na tabela mas sem efeito funcional — a distinção entre modos é feita pela presença de `NROEMPRESA BETWEEN 500 AND 599` no lote |
| `IND_ARRED` | CHAR | `'S'` = habilita [[Arredondamento]] logístico (usado somente no modo Consolidação) |
| `PERC_ARRED` | NUMBER | Percentual mínimo para arredondar; `NULL` = usa `PERCVARIACAOSUG` do produto |

---

## Coordenação entre os dois modos

O `NAGTRG_BI_MAC_GERCOMPRAITEM` usa dois checks sequenciais:

```sql
-- 1. Existe parametrização para este comprador/fornecedor?
SELECT COUNT(1)
  INTO psIndAcataSug
  FROM NAGT_COMP_FORN_SUGESTAUTO X
 WHERE psSeqComprador = X.SEQCOMPRADOR
   AND psSeqFornec = NVL(X.SEQFORNECEDOR, psSeqFornec);

-- 2. Existe CD (empresa 500–599) no lote?
SELECT COUNT(1)
  INTO psCD
  FROM MAC_GERCOMPRAEMP GE
 WHERE GE.SEQGERCOMPRA = :NEW.SEQGERCOMPRA
   AND GE.NROEMPRESA BETWEEN 500 AND 599;

IF psIndAcataSug > 0 AND psCD = 0 THEN
  -- Acata Sugerido Automático
END IF;
```

- `psIndAcataSug` = total de linhas na parametrização para o comprador/fornecedor
- `psCD` = quantidade de empresas 500–599 registradas em `MAC_GERCOMPRAEMP` para o lote
- `psCD = 0` garante que o BEFORE INSERT **não atua** quando há CD no lote — o [[COMPOUND TRIGGER]] assume esses casos
- A coordenação é feita via `MAC_GERCOMPRAEMP` (não `MAC_GERCOMPRAITEM`) para evitar [[ORA-04091]] no BEFORE INSERT

| `psIndAcataSug` | `psCD` | Resultado |
|---|---|---|
| 0 | qualquer | Nenhum comportamento — [[Lote de Compra\|lote]] não parametrizado |
| > 0 | 0 | **Acata Sugerido** — BEFORE INSERT atua |
| > 0 | > 0 | **Consolidação** — BEFORE INSERT passa; [[COMPOUND TRIGGER]] atua |

---

## Comportamento 1 — Acata Sugerido Automático (sem CD no lote)

**Problema resolvido:** O [[Comprador]] precisava clicar manualmente em "Acata Sugerido" em cada [[Lote de Compra|lote]]. Com a [[Trigger]], o comportamento é automático para combinações parametrizadas.

**Trigger:** `NAGTRG_BI_MAC_GERCOMPRAITEM` — `BEFORE INSERT ON MAC_GERCOMPRAITEM FOR EACH ROW FOLLOWS TBIU_MAC_GERABASTECITEM`

### Fluxo

```
INSERT em MAC_GERCOMPRAITEM
        │
        ▼
Busca SEQFORNECEDOR (MAC_GERCOMPRAFORN)
Busca SEQCOMPRADOR  (MAC_GERCOMPRA, TIPOLOTE = 'C')
        │
        ▼
psIndAcataSug > 0? (parametrizado em NAGT_COMP_FORN_SUGESTAUTO)
   ┌────┴────┐
  Não       Sim
   │         │
(sem ação)  psCD = 0? (MAC_GERCOMPRAEMP: nenhuma empresa 500–599)
              ├── Não → (sem ação — COMPOUND TRIGGER cuida do lote)
              └── Sim → QTDSUGERIDAFORNEC > 0?
                           ├── Sim → QTDPEDIDA = QTDSUGERIDAFORNEC
                           └── Não → QTDPEDIDA = 0
                           │
                           ▼
                      SITUACAOITEM = 'S'
```

### Campos afetados em `MAC_GERCOMPRAITEM`

| Campo | Comportamento |
|---|---|
| `QTDPEDIDA` | Recebe `QTDSUGERIDAFORNEC` se > 0; caso contrário, `0` |
| `SITUACAOITEM` | Definido como `'S'` (Acata Sugerido) |

### Parametrização

```sql
-- Comprador 289, todos os fornecedores
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO (SEQCOMPRADOR, SEQFORNECEDOR) VALUES (289, NULL);

-- Comprador 289, fornecedor específico
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO (SEQCOMPRADOR, SEQFORNECEDOR) VALUES (289, 1234);
```

> A distinção entre Acata Sugerido e Consolidação **não depende de `CD_AGRUP`** — o que determina qual trigger atua é a presença ou ausência de uma empresa `BETWEEN 500 AND 599` no lote (`MAC_GERCOMPRAEMP`).

---

## Comportamento 2 — Consolidação com Arredondamento (CD detectado dinamicamente)

**Problema resolvido:** No [[Lote de Compra|lote]] consolidado, o [[CD]] precisa pedir a soma do que todas as [[Loja|lojas]] vão receber. No `INSERT` linha a linha a tabela ainda está em mutação, impedindo consultas à própria `MAC_GERCOMPRAITEM`. A [[COMPOUND TRIGGER]] resolve: guarda os itens do [[CD]] em memória no `AFTER EACH ROW` e faz o cálculo/UPDATE somente no `AFTER STATEMENT`.

**Trigger:** `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` — `COMPOUND TRIGGER FOR INSERT ON MAC_GERCOMPRAITEM`

> [!note] Por que COMPOUND TRIGGER?
> Uma [[Trigger]] `FOR EACH ROW` não pode consultar a própria `MAC_GERCOMPRAITEM` durante o `INSERT` — gera [[ORA-04091]] (table is mutating). O padrão [[COMPOUND TRIGGER]] resolve: acumula itens no `AFTER EACH ROW` e opera sobre a tabela apenas no `AFTER STATEMENT`, quando o INSERT já terminou.

> [!info] Detecção dinâmica do CD
> O CD consolidação **não é mais lido de `CD_AGRUP`**. O COMPOUND TRIGGER detecta o CD em runtime: qualquer empresa com `NROEMPRESA BETWEEN 500 AND 599` no lote é candidata, e `MIN(NROEMPRESA)` desse intervalo é o CD efetivo. Se nenhuma linha 500–599 existir no lote, o trigger não processa nada.

### Fluxo

```
INSERT em MAC_GERCOMPRAITEM
         │
         ▼
   AFTER EACH ROW
         │
         ├─ Busca SEQFORNECEDOR   (MAC_GERCOMPRAFORN)
         ├─ Busca SEQCOMPRADOR    (MAC_GERCOMPRA, TIPOLOTE = 'C')
         ├─ Verifica NAGT_COMP_FORN_SUGESTAUTO
         │    → COUNT(1), MAX(PERC_ARRED), MAX(IND_ARRED)
         ├─ Confirma psIndAcataSug > 0 AND :NEW.NROEMPRESA BETWEEN 500 AND 599
         └─ Guarda em memória: SEQGERCOMPRA, SEQPRODUTO, NROEMPRESA, PERC_ARRED, IND_ARRED
                   │
                   ▼
          AFTER STATEMENT (para cada item candidato a CD em memória)
                   │
                   ├─ Determina v_cd_consolidacao = MIN(NROEMPRESA BETWEEN 500 AND 599)
                   │    ← consulta MAC_GERCOMPRAITEM agora segura (INSERT concluído)
                   ├─ Pula se item não é o CD mínimo (v_cd_consolidacao IS NULL
                   │    ou item.nroempresa ≠ v_cd_consolidacao)
                   ├─ Soma QTDSUGERIDAFORNEC das lojas (NROEMPRESA <> v_cd_consolidacao)
                   ├─ Busca PALETELASTRO / PALETEALTURA   (MRL_PRODEMPRESAWM no CD)
                   ├─ Busca QTDEMBALAGEM do item do CD    (MAC_GERCOMPRAITEM)
                   ├─ Resolve percentual (PERC_ARRED → PERCVARIACAOSUG se NULL)
                   ├─ Converte para embalagens: total / QTDEMBALAGEM
                   ├─ Aplica arredondamento (palete → lastro → mantém)
                   ├─ Reconverte para unidades: total_emb × QTDEMBALAGEM
                   └─ UPDATE QTDPEDIDA no item do CD
```

### Regra de Arredondamento

O [[Arredondamento]] só ocorre quando `IND_ARRED = 'S'`, percentual configurado, `QTDEMBALAGEM > 0` e `v_palete > 0`. Nunca **reduz** a quantidade.

O cálculo opera em **embalagens** (caixas/fardos) — a soma das [[Loja|lojas]] é primeiro convertida dividindo por `QTDEMBALAGEM`, arredondada, e depois reconvertida multiplicando de volta.

```
── Preparação ──
v_total_emb = SUM(QTDSUGERIDAFORNEC lojas) / QTDEMBALAGEM
QTY_PALETE  = PALETELASTRO × PALETEALTURA   ← em embalagens

── Arredondamento ──
1. resto_palete = v_total_emb MOD v_palete
   se (resto_palete / v_palete) × 100 >= PERC_ARRED
       → v_total_emb = FLOOR(v_total_emb / v_palete) × v_palete + v_palete

2. senão: resto_lastro = v_total_emb MOD PALETELASTRO
   se (resto_lastro / PALETELASTRO) × 100 >= PERC_ARRED
       → v_total_emb = CEIL(v_total_emb / PALETELASTRO) × PALETELASTRO

3. senão: mantém v_total_emb original

── Resultado ──
QTDPEDIDA = v_total_emb × QTDEMBALAGEM
```

### Exemplos

Os exemplos abaixo assumem `QTDEMBALAGEM = 1` (a sugestão já está em embalagens).

| Sugestão (lojas) | Lastro | Palete | Percentual | Resultado | Motivo |
|---:|---:|---:|---:|---:|---|
| 32 | 10 | 40 | 60% | **40** | 32/40 = 80% ≥ 60% → completa palete |
| 26 | 10 | 60 | 60% | **30** | 26/60 = 43% < 60%; 6/10 = 60% ≥ 60% → completa lastro |
| 23 | 10 | 40 | 60% | **23** | 23/40 = 57,5%; 3/10 = 30% — nenhum limite atingido |
| 328 | 13 | 104 | 60% | **328** | 16/104 = 15%; 3/13 = 23% — mantém |

### Fallback de Percentual

```
NAGT_COMP_FORN_SUGESTAUTO.PERC_ARRED preenchido → usa PERC_ARRED
PERC_ARRED = NULL                               → busca MRL_PRODUTOEMPRESA.PERCVARIACAOSUG
Ambos NULL                                      → mantém quantidade sem arredondar
```

### Parametrização

```sql
-- Comprador 289, todos os fornecedores, modo Consolidação, com arredondamento 60%
-- CD_AGRUP = qualquer valor ≠ NULL (sinaliza ao BEFORE INSERT para não atuar)
-- O NROEMPRESA real do CD é detectado pela faixa 500–599 no lote
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO
  (SEQCOMPRADOR, SEQFORNECEDOR, CD_AGRUP, IND_ARRED, PERC_ARRED)
VALUES (289, NULL, 1, 'S', 60);
```

---

## Manutenção

**Consultar todas as parametrizações:**

```sql
SELECT X.SEQCOMPRADOR, C.NOMECOMPRADOR,
       X.SEQFORNECEDOR, F.NOMEFORNECEDOR,
       X.CD_AGRUP,
       X.IND_ARRED, X.PERC_ARRED,
       CASE WHEN X.CD_AGRUP IS NULL THEN 'Acata Sugerido' ELSE 'Consolidação' END AS MODO
  FROM NAGT_COMP_FORN_SUGESTAUTO X
  LEFT JOIN MAX_COMPRADOR  C ON C.SEQCOMPRADOR  = X.SEQCOMPRADOR
  LEFT JOIN MAF_FORNECEDOR F ON F.SEQFORNECEDOR = X.SEQFORNECEDOR
 ORDER BY X.SEQCOMPRADOR, X.CD_AGRUP NULLS FIRST;
```

**Verificar qual CD está no lote e seus parâmetros logísticos:**

```sql
-- CD do lote: MIN(NROEMPRESA BETWEEN 500 AND 599)
SELECT MIN(NROEMPRESA) AS CD_CONSOLIDACAO
  FROM MAC_GERCOMPRAITEM
 WHERE SEQGERCOMPRA = :SEQGERCOMPRA
   AND NROEMPRESA BETWEEN 500 AND 599;

-- Parâmetros logísticos do CD para um produto
SELECT M.PALETELASTRO, M.PALETEALTURA,
       M.PALETELASTRO * M.PALETEALTURA AS QTY_PALETE
  FROM MRL_PRODEMPRESAWM M
 WHERE M.NROEMPRESA = :CD_CONSOLIDACAO
   AND M.SEQPRODUTO = :SEQPRODUTO;
```

**Remover parametrização:**

```sql
DELETE FROM NAGT_COMP_FORN_SUGESTAUTO
 WHERE SEQCOMPRADOR = 289 AND SEQFORNECEDOR IS NULL;
```

---

## Pontos de Atenção

> [!warning] Parametrização logística é crítica
> A trigger usa diretamente `PALETELASTRO` e `PALETEALTURA` de `MRL_PRODEMPRESAWM`. Se esses valores estiverem incorretos, o arredondamento também estará. Verificar sempre antes de diagnosticar resultados inesperados.

> [!tip] `QTDEMBALAGEM` como fator de conversão
> A soma de `QTDSUGERIDAFORNEC` das lojas está em unidades de produto. Antes de arredondar, a trigger converte para embalagens (`÷ QTDEMBALAGEM`), aplica o arredondamento em embalagens e depois reconverte (`× QTDEMBALAGEM`). `PALETELASTRO` e `PALETEALTURA` estão expressos em embalagens. Se `QTDEMBALAGEM = 0` o arredondamento é ignorado.

> [!note] Fornecedor NULL = todos
> `SEQFORNECEDOR = NULL` em `NAGT_COMP_FORN_SUGESTAUTO` ativa o comportamento para qualquer [[Fornecedor]] do [[Comprador]] em ambos os modos.

> [!note] `TIPOLOTE = 'C'`
> O `SEQCOMPRADOR` só é buscado em [[Lote de Compra|lotes]] do tipo `'C'` (Consolidado). Lotes de outros tipos não ativam nenhum dos comportamentos.
