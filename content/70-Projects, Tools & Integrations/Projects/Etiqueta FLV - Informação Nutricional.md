---
Language:
  - "[[Oracle SQL]]"
  - "[[ZPL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[FruLeVe]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[ERP]]"
Open Tags:
  - "[[Etiqueta]]"
  - "[[NFe]]"
  - "[[Produto]]"
  - "[[FLV]]"
Date: 2026-07-24
Type: Project
---

> [!info] Contexto
> Geração automática de etiqueta de **Informação Nutricional** para produtos da linha **FLV (FruLeVe)** diretamente pelo ERP Oracle. O ERP monta a string [[ZPL]] completa via view, que é enviada à impressora Zebra para impressão sob demanda. Os dados nutricionais são cadastrados no ERP por família de produto e consultados via pivot view.

---

## Arquitetura

```
MAP_INFNUTRIC ──────────────────────────────────┐
MAP_INFNUTRICTAB ──── NAGV_INFNUTRIC_PIVOT_V4 ──┤
MAX_ATRIBUTOFIXO ───────────────────────────────┤
                                                 ├── NAGV_ETIQ_INFNUTRIC ──► ZPL ──► Zebra
MAP_PRODUTO ─────────────────────────────────────┤
MAP_FAMEMBALAGEM ────────────────────────────────┤
MAP_INFNUTRICFAM ────────────────────────────────┤
MRLX_BASEETIQUETAPROD ───────────────────────────┘
```

---

## Objetos

| Objeto | Tipo | Repositório |
|--------|------|-------------|
| [NAGV_ETIQ_INFNUTRIC](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGV_ETIQ_INFNUTRIC.sql) | View — ZPL generator | DDL-Objects-Oracle |
| [NAGV_INFNUTRIC_PIVOT_V4](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGV_INFNUTRIC_PIVOT_V4.sql) | View — tabela nutricional | DDL-Objects-Oracle |
| [Versao FLV.zpl](https://github.com/GiulianoGMS/ZPLs/blob/main/Versao%20FLV.zpl) | Template ZPL estático (referência) | ZPLs |

---

## View Base: NAGV_INFNUTRIC_PIVOT_V4

Pivota os dados nutricionais do cadastro do ERP — uma linha por `SEQINFNUTRIC` com uma coluna por nutriente.

**Fontes:**

| Tabela | Papel |
|--------|-------|
| `MAP_INFNUTRIC` | Cabeçalho nutricional: `SEQINFNUTRIC`, `QTDPORCAO` (g por porção) |
| `MAP_INFNUTRICTAB` | Valor por nutriente: `DESCQTDPORCAO` (qtd), `PERCVLRDIAREF` (%VD) |
| `MAX_ATRIBUTOFIXO` | Dicionário de atributos: coluna `LISTA` identifica o nutriente (`TIPATRIBUTOFIXO = 'INFNUTRIC'`) |

**Nutrientes (valores de `LISTA`):**

| LISTA | Nutriente |
|-------|-----------|
| `VE` | Valor Energético (kcal) |
| `C` | Carboidratos (g) |
| `AT` | Açúcares Totais (g) |
| `AA` | Açúcares Adicionados (g) |
| `P` | Proteínas (g) |
| `GT` | Gorduras Totais (g) |
| `GS` | Gorduras Saturadas (g) |
| `GR` | Gorduras Trans (g) |
| `FA` | Fibras Alimentares (g) |
| `SO` | Sódio (mg) |

**Colunas por nutriente:**

| Sufixo | Cálculo |
|--------|---------|
| `_PORCAO` | Valor por porção (de `DESCQTDPORCAO`) |
| `_100G` | `PORCAO × 100 / QTDPORCAO` |
| `_VD` | % Valor Diário (de `PERCVLRDIAREF`) |

---

## View ZPL: NAGV_ETIQ_INFNUTRIC

Gera a string [[ZPL]] completa por produto. Cada linha do resultado é uma etiqueta pronta para envio à impressora.

**Joins principais:**

| Alias | Tabela | Condição |
|-------|--------|----------|
| `P` | `MAP_PRODUTO` | — produto |
| `E` | `MAP_FAMEMBALAGEM` | `SEQFAMILIA`, `QTDEMBALAGEM = 1` |
| `A` | `MRLX_BASEETIQUETAPROD` | `SEQPRODUTO` |
| `N` | `MAP_INFNUTRICFAM` | `SEQFAMILIA` — liga família ao registro nutricional |
| `T` | `NAGV_INFNUTRIC_PIVOT_V4` | `N.SEQINFNUTRIC` |

**Campos da etiqueta e suas fontes:**

| Campo na etiqueta | Fonte |
|-------------------|-------|
| Título do produto | `P.DESCCOMPLETA` (até 40 chars, UPPER) |
| Peso líquido | `E.PESOLIQUIDO` (g) |
| Data de embalagem | `SYSDATE` |
| Peso da embalagem | `6 g` ⚠️ hardcoded |
| Lote | `MAX(SEQNF)` de `MLF_NOTAFISCAL` — últimas entradas 30 dias, `NROEMPRESA > 500`; fallback `90000404` |
| Origem | `PRODUTO DO BRASIL` ⚠️ hardcoded |
| QR Code | URL `https://shre.ink/jDCi` ⚠️ hardcoded |
| PLU (vertical) | `P.SEQPRODUTO` |
| Porções por embalagem | `ROUND(E.PESOLIQUIDO × 1000 / T.QTDPORCAO)` |
| Tamanho da porção | `T.QTDPORCAO g` |
| Tabela nutricional | `T.*` — todos os 10 nutrientes × 3 colunas (`_PORCAO`, `_100G`, `_VD`) |
| Código de barras | EAN-13 de `MAP_PRODCODIGO` (`TIPCODIGO = 'E'`, `QTDEMBALAGEM = 1`) |

**Especificações ZPL:**
- Largura: `^PW800` (800 dots)
- Altura: `^LL1000` (1000 dots)
- Charset: `^CI28` (UTF-8)
- Quantidade: `^PQ` + `A.QTDETIQUETA` (padrão 1)

---

## Layout da Etiqueta

```
┌─────────────────────────────────────────────────────┐
│                [NOME DO PRODUTO]            [QR]    │
│─────────────────────────────────────────────────────│
│ Emb.: DD/MM/AAAA    Peso Liq.:          PLU│
│ Peso Emb.: 6g         NNN g           vertical│
│ Lote: XXXXXX                                        │
│ PRODUTO DO BRASIL                                   │
│─────────────────────────────────────────────────────│
│          INFORMACAO NUTRICIONAL                     │
│ Porcoes por embalagem: Cerca de N                   │
│ Porcao: NNg                                         │
│─────────────────────────────────────────────────────│
│ Item                     │ 100g │ NNg  │ %VD* │     │
│ Valor energetico (kcal)  │      │      │      │     │
│ Carboidratos (g)         │      │      │      │     │
│   Acucares totais (g)    │      │      │      │     │
│     Acucares adicionados │      │      │      │     │
│ Proteinas (g)            │      │      │      │     │
│ Gorduras totais (g)      │      │      │      │     │
│   Gorduras saturadas (g) │      │      │      │     │
│   Gorduras trans (g)     │      │      │      │     │
│ Fibras alimentares (g)   │      │      │      │     │
│ Sodio (g)                │      │      │      │     │
│ *Percentual de valores diarios fornecidos...        │
│─────────────────────────────────────────────────────│
│         [CÓDIGO DE BARRAS EAN-13]                   │
└─────────────────────────────────────────────────────┘
```

---

## Print da Etiqueta

> [!note] Adicionar print aqui
> _Inserir screenshot ou foto da etiqueta impressa._

---

## Pendências (TODOs)

> [!warning] Itens pendentes no código

| # | Campo | Situação | Nota no código |
|---|-------|----------|---------------|
| 1 | Origem (UF) | ⚠️ Hardcoded `PRODUTO DO BRASIL` | Puxar UF do CD na última nota de entrada do produto |
| 2 | Medida caseira | ⚠️ Não implementado | Ex.: `"1/2 xícara de chá"` — falta de-para via `MEDCASEIRA / INTMEDCASEIRA / DECMEDCASEIRA` |
| 3 | Peso da embalagem | ⚠️ Hardcoded `6 g` | Tornar dinâmico |
| 4 | Casas decimais no pivot | ⚠️ Em análise | `REPLACE(',','.')` em `MAP_INFNUTRICTAB.DESCQTDPORCAO` — ajustar conforme definição de casas |
