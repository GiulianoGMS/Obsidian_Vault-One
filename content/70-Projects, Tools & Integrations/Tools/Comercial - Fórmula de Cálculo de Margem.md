---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Comercial]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Margem]]"
  - "[[Precificação]]"
  - "[[Tabela de Custo]]"
Date: 2026-08-13
Type: Ferramenta
---

> [!info] Referência
> Calculadora em planilha: `11-Source Material/CalcMargem.xlsx`
> Funções Oracle relacionadas: `CONSINCO.FCALCULAPIC` · `CONSINCO.FCUSTOLIQUIDOBASEZERO` · `CONSINCO.FPRECOSUGERIDOPIC`

---

## Contexto

O [[ERP]] Consinco calcula a [[Margem]] em dois contextos distintos com fórmulas ligeiramente diferentes:

| Tela | Função interna | Diferença principal |
|---|---|---|
| **Tabela de Custo** (`frmCustoCompraFam`) | `FCALCULAPIC` | Usa impostos totais sem ajuste de crédito PIS/COFINS × ICMS |
| **Simulação** (`dlgSimulaCustoCompraFornec`) | `FPRECOSUGERIDOPIC` | Subtrai `vnImpostoSubtraiICMS` dos impostos totais |

---

## Fórmulas

### Tabela de Custo (`frmCustoCompraFam`)

```
Margem = ( Preço_Alvo
           - ( Preço_Alvo × ( DespOp + Impostos + Comissão + DebitoICMS ) / 100 )
           - CustoLíquido
         ) / Preço_Alvo × 100
```

**Exemplo — Família 77356:**

| Variável | Valor |
|---|---:|
| `dfnPrecoAlvo` (Preço alvo) | 24,98 |
| `clnPerImposto` (Total impostos) | 27,25% |
| `clnPerDespOperacional` | 0% |
| `clnPerComissaoNormal` | 0% |
| `clnPerDebitoICMS` | 0% |
| `vnCustoLiquidoPrAlv` (Custo líquido) | 11,456106 |

```sql
SELECT (( 24.98 - ( 24.98 * ( 0 + 27.25 + 0 + 0 )) / 100 ) - 11.456106 ) / 24.98 * 100
  FROM DUAL;
-- Resultado: 26,8889%
```

---

### Simulação (`dlgSimulaCustoCompraFornec`)

```
Margem = ( Preço_Sug
           - ( Preço_Sug × ( TotalImpostos - vnImpostoSubtraiICMS )
               + DespOp + Comissão + FatorST ) / 100
           - ( CustoLíquido - CustoLíquido × DescFormPreco / 100 )
         ) / Preço_Sug × 100
```

**Ajuste `vnImpostoSubtraiICMS`:**

```
vnImpostoSubtraiICMS = (( PIS + COFINS ) × ICMS_Débito ) / 100
```

> Este valor é subtraído dos impostos totais para evitar dupla contagem quando há crédito de PIS/COFINS compensando ICMS.

**Exemplo — Família 77356 (mesmo produto):**

| Variável | Valor |
|---|---:|
| `dfnPrecoSug` | 24,98 |
| `dfnPvTotalImpostos` | 27,25% |
| `dfnPvPis` (Débito PIS) | 1,65% |
| `dfnPvCofins` (Débito COFINS) | 7,60% |
| `dfnPvICMS` (Débito ICMS) | 18% |
| `dfnVdaVlrCustoLiquido` | 11,456106 |
| `dfnPercDescFormPreco` | 0% |

```
vnImpostoSubtraiICMS = (( 1,65 + 7,60 ) × 18 ) / 100 = 1,665
```

```sql
SELECT (( 24.98 - ( 24.98 * (27.25 - 1.665) + 0 + 0 + 0 ) / 100 )
        - ( 11.456106 - 11.456106 * 0 / 100 )) / 24.98 * 100
  FROM DUAL;
-- Resultado: 28,5539%
```

> A margem da **Simulação** (28,55%) é maior que a da **Tabela** (26,89%) porque desconta o crédito de PIS/COFINS aplicado contra o ICMS.

---

## Queries de Verificação

Compara margem **Sugerida**, **Praticada** e **Concorrente** para um mesmo produto:

```sql
-- Exemplo: Preço praticado 108,99 | Concorrente 129,90
-- Impostos 34,25% | PIS 1,65% | COFINS 7,60% | ICMS 25%
-- Custo líquido 50,8116

SELECT 'SUGERIDO' AS TIPO,
       ROUND((( 108.99
               - ( 108.99 * (34.25 - ((7.60 + 1.65) * 25 / 100)) / 100
                   + 0 + 0 + 0 ))
             - ( 50.8116 - 50.8116 * 0 / 100 )) / 108.99 * 100, 4) AS MARGEM
  FROM DUAL

UNION ALL

SELECT 'PRATICADO',
       ROUND((( 108.99
               - ( 108.99 * (34.25 - ((7.60 + 1.65) * 0 / 100)) + 0 + 0 + 0 ) / 100 )
             - ( 50.8116 - 50.8116 * 0 / 100 )) / 108.99 * 100, 4)
  FROM DUAL

UNION ALL

SELECT 'CONCORRENTE',
       ROUND((( 129.90
               - ( 129.90 * (34.25 - ((7.60 + 1.65) * 0 / 100)) + 0 + 0 + 0 ) / 100 )
             - ( 50.8116 - 50.8116 * 0 / 100 )) / 129.90 * 100, 4)
  FROM DUAL;
```

| Tipo | Fórmula | Nota |
|---|---|---|
| SUGERIDO | Simulação com `vnImpostoSubtraiICMS` | Margem alvo com crédito |
| PRATICADO | Tabela, ICMS offset = 0 | Reflete o preço real praticado |
| CONCORRENTE | Tabela com preço do concorrente | Benchmark externo |

---

## Pesquisa da Função no Banco

Para localizar onde `vnImpostoSubtraiICMS` é calculado no código-fonte Oracle:

```sql
SELECT NAME, TEXT
  FROM ALL_SOURCE
 WHERE UPPER(TEXT) LIKE '%VNIMPOSTOSUBTRAIICMS%';
```

---

## Margem Líquida — Consulta Produto (`CalcMargem.xlsx`)

Terceira forma de cálculo: a margem exibida na **tela de Consulta Produto** do [[ERP]]. Diferente das anteriores, aplica os impostos em **cascata** — os "outros impostos" (PIS/COFINS etc.) incidem sobre a base já deduzida do ICMS.

### Fórmula Principal

```
Impostos efetivos = ICMS + (Outros Impostos × (1 - ICMS))
Margem líquida   = (Preço - (Preço × Impostos efetivos) - Custo Líquido) / Preço
```

> `Outros Impostos` = PIS + COFINS + demais (sem ICMS)
> A base após ICMS é `1 - ICMS` — os outros impostos **não** incidem sobre o ICMS embutido no preço.

### Exemplo (`CalcMargem.xlsx`)

**Entradas:**

| Campo | Valor |
|---|---:|
| Preço sugerido | R$ 13,98 |
| Custo Nota Fiscal | R$ 9,441165 |
| Crédito PIS/COFINS | R$ 0,873307 |
| Descontos | R$ 0,031236 |
| **Custo Líquido** | **R$ 8,536622** |
| ICMS | 18,00% |
| Outros Impostos | 9,25% |

**Cálculo:**

| Etapa | Valor |
|---|---:|
| Margem bruta simples `(Preço - CustoLíq) / Preço` | 38,9369% |
| Base após ICMS `(1 - 18%)` | 0,82 |
| Outros impostos efetivos `9,25% × 0,82` | 7,585% |
| **Impostos efetivos totais** `18% + 7,585%` | **25,585%** |
| Valor ICMS `13,98 × 18%` | R$ 2,5164 |
| Valor outros impostos `13,98 × 7,585%` | R$ 1,0604 |
| Total impostos em R$ | R$ 3,5768 |
| Valor após impostos `13,98 - 3,5768` | R$ 10,4032 |
| Lucro líquido `10,4032 - 8,5366` | R$ 1,8666 |
| **Margem líquida** | **13,3519%** |

```sql
-- Verificação no banco
SELECT ROUND((13.98 - (13.98 * (0.18 + (0.0925 * (1 - 0.18)))) - 8.536622) / 13.98 * 100, 4) AS MARGEM_LIQUIDA
  FROM DUAL;
-- Resultado: 13,3519%
```

### Comparação entre as três margens

| Margem               | Tela                         | Diferença                                                      |
| -------------------- | ---------------------------- | -------------------------------------------------------------- |
| **Tabela de Custo**  | `frmCustoCompraFam`          | Impostos totais sem ajuste de crédito                          |
| **Simulação**        | `dlgSimulaCustoCompraFornec` | Subtrai `vnImpostoSubtraiICMS` (crédito PIS/COFINS × ICMS)     |
| **Consulta Produto** | Consulta Produto             | Impostos em cascata: outros incidem sobre base líquida de ICMS |
