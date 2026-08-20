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
Date: 2026-08-12
Type:
---

> [!info] Contexto
> Evolução do [[Acata Sugerido Automático no Lote de Compras]]. Enquanto o v1 copia `QTDSUGERIDAFORNEC` diretamente para cada loja, este projeto trata especificamente o **CD de consolidação**: soma a sugestão de todas as lojas e aplica arredondamento logístico (palete/lastro) antes de gravar `QTDPEDIDA`.

---

## Visão Geral

[[Trigger]] `COMPOUND TRIGGER FOR INSERT ON MAC_GERCOMPRAITEM` que, ao inserir itens de um lote consolidado, calcula automaticamente a `QTDPEDIDA` do [[CD]] como a **soma das sugestões das lojas** e opcionalmente arredonda para o múltiplo logístico mais próximo (lastro ou palete).

**Problema resolvido:** No lote consolidado, o [[CD]] precisa pedir a soma do que as lojas vão receber — mas no momento do `INSERT` linha a linha a tabela ainda está em mutação, impedindo consultas à própria `MAC_GERCOMPRAITEM`. A `COMPOUND TRIGGER` resolve isso: guarda os itens em memória no `AFTER EACH ROW` e faz o cálculo/update somente no `AFTER STATEMENT`.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `MAC_GERCOMPRAITEM` | Tabela | Itens do lote — alvo da trigger |
| `MAC_GERCOMPRAFORN` | Tabela | Fornecedor do lote (`SEQFORNECEDOR`) |
| `MAC_GERCOMPRA` | Tabela | Cabeçalho do lote — identifica `SEQCOMPRADOR` e `TIPOLOTE = 'C'` |
| `NAGT_COMP_FORN_SUGESTAUTO` | Tabela | Parametrização — comprador, fornecedor, CD e regras de arredondamento |
| `MRL_PRODEMPRESAWM` | Tabela | Parâmetros logísticos do produto: `PALETELASTRO`, `PALETEALTURA` |
| `MRL_PRODUTOEMPRESA` | Tabela | Fallback do percentual de arredondamento: `PERCVARIACAOSUG` |
| `NAGTRG_BI_MAC_GERCOMPRAITEM` | Trigger | Compound Trigger que implementa o processo |

---

## Tabela de Controle — `NAGT_COMP_FORN_SUGESTAUTO`

Estendida em relação ao v1 com os campos de consolidação e arredondamento:

| Campo           | Uso                                                                          |
| --------------- | ---------------------------------------------------------------------------- |
| `SEQCOMPRADOR`  | Comprador do lote consolidado                                                |
| `SEQFORNECEDOR` | [[Fornecedor]] específico; `NULL` = qualquer fornecedor                      |
| `CD_AGRUP`      | Empresa/CD de consolidação que receberá o tratamento                         |
| `IND_ARRED`     | `'S'` = habilita arredondamento logístico                                    |
| `PERC_ARRED`    | Percentual mínimo para arredondar; `NULL` = usa `PERCVARIACAOSUG` do produto |

---

## Lógica da Trigger

### Estrutura [[COMPOUND]] [[TRIGGER]]

```
AFTER EACH ROW  → identifica se o item pertence ao CD_AGRUP e guarda em memória
AFTER STATEMENT → consulta MAC_GERCOMPRAITEM sem risco de mutating, calcula e faz UPDATE
```

> [!note] Por que COMPOUND TRIGGER?
> Uma trigger `FOR EACH ROW` não pode consultar a própria `MAC_GERCOMPRAITEM` durante o `INSERT` — gera `ORA-04091 table is mutating`. O padrão COMPOUND TRIGGER resolve: acumula itens no `AFTER EACH ROW` e opera sobre a tabela apenas no `AFTER STATEMENT`, quando o `INSERT` já terminou.

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
         ├─ Confirma NROEMPRESA = CD_AGRUP
         └─ Guarda item em memória (v_itens)
                   │
                   ▼
          AFTER STATEMENT
                   │
                   ├─ Soma QTDSUGERIDAFORNEC das lojas (exceto o próprio CD)
                   ├─ Busca PALETELASTRO / PALETEALTURA   (MRL_PRODEMPRESAWM)
                   ├─ Resolve percentual (PERC_ARRED → PERCVARIACAOSUG)
                   ├─ Aplica arredondamento (palete → lastro → mantém)
                   └─ UPDATE QTDPEDIDA no item do CD
```

---

## Regra de Arredondamento

O [[arredondamento]] só ocorre quando `IND_ARRED = 'S'` e existe percentual configurado. Nunca **reduz** a quantidade.

```
QTY_PALETE = PALETELASTRO × PALETEALTURA

1. restante do palete = quantidade % palete
   se (restante / palete) × 100 >= PERC_ARRED → completa palete

2. senão: restante do lastro = quantidade % lastro
   se (restante / lastro) × 100 >= PERC_ARRED → CEIL(quantidade / lastro) × lastro

3. senão: mantém quantidade original
```

### Exemplos

| Sugestão | Lastro | Palete | Percentual | Resultado | Motivo |
|---:|---:|---:|---:|---:|---|
| 32 | 10 | 40 | 60% | **40** | 32/40 = 80% ≥ 60% → completa palete |
| 26 | 10 | 60 | 60% | **30** | 26/60 = 43% < 60%; 6/10 = 60% ≥ 60% → completa lastro |
| 23 | 10 | 40 | 60% | **23** | 23/40 = 57,5%; 3/10 = 30% — nenhum limite atingido |
| 328 | 13 | 104 | 60% | **328** | 16/104 = 15%; 3/13 = 23% — mantém |

---

## Fallback de Percentual

```
NAGT_COMP_FORN_SUGESTAUTO.PERC_ARRED preenchido
        → usa PERC_ARRED

PERC_ARRED = NULL
        → busca MRL_PRODUTOEMPRESA.PERCVARIACAOSUG

Ambos NULL
        → mantém quantidade sem arredondar
```

---

## Manutenção

**Consultar parametrizações:**
```sql
SELECT X.SEQCOMPRADOR, C.NOMECOMPRADOR,
       X.SEQFORNECEDOR, F.NOMEFORNECEDOR,
       X.CD_AGRUP, X.IND_ARRED, X.PERC_ARRED
  FROM NAGT_COMP_FORN_SUGESTAUTO X
  LEFT JOIN MAX_COMPRADOR  C ON C.SEQCOMPRADOR  = X.SEQCOMPRADOR
  LEFT JOIN MAF_FORNECEDOR F ON F.SEQFORNECEDOR = X.SEQFORNECEDOR
 ORDER BY X.SEQCOMPRADOR;
```

**Verificar parâmetros logísticos de um produto no CD:**
```sql
SELECT M.PALETELASTRO, M.PALETEALTURA,
       M.PALETELASTRO * M.PALETEALTURA AS QTY_PALETE
  FROM MRL_PRODEMPRESAWM M
 WHERE M.NROEMPRESA = :CD_AGRUP
   AND M.SEQPRODUTO = :SEQPRODUTO;
```

---

## Pontos de Atenção

> [!warning] Parametrização logística é crítica
> A trigger usa diretamente `PALETELASTRO` e `PALETEALTURA` de `MRL_PRODEMPRESAWM`. Se esses valores estiverem incorretos, o arredondamento também estará. Verificar sempre antes de diagnosticar resultados inesperados.

> [!tip] QTDEMBALAGEM não participa do cálculo
> `QTDSUGERIDAFORNEC` e `PALETELASTRO` estão na mesma unidade logística (caixas, fardos). `QTDEMBALAGEM` representa unidades dentro da embalagem — não entra no arredondamento.

> [!note] Fornecedor NULL = todos
> `SEQFORNECEDOR = NULL` em `NAGT_COMP_FORN_SUGESTAUTO` ativa o comportamento para qualquer fornecedor do comprador. Mesmo comportamento do v1.
