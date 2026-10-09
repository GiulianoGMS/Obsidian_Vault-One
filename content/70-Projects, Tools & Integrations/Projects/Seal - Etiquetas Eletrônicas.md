---
Language:
  - "[[Oracle SQL]]"
Repository:
  - "[[PJ-Etiquetas-Eletronicas]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[ERP]]"
Open Tags:
  - "[[SEAL]]"
  - "[[Etiqueta Eletrônica]]"
  - "[[Integração]]"
  - "[[Promoção]]"
  - "[[PDV]]"
Date: 2026-10-09
Type: Project
tags:
  - Projects
---

[Repositório no GitHub →](https://github.com/GiulianoGMS/PJ-Etiquetas-Eletronicas)

Integração entre o [[ERP]] [[Consinco]] e a plataforma **[[SEAL]]** de [[Etiqueta Eletrônica|etiquetas eletrônicas]] de gôndola. A view principal consolida preço normal, promoções [[PDV]] e regras de incentivo ([[Cartão Nagumo]]) em uma única saída, com indicador de sincronização com a última carga do [[PDV]].

---

## Arquitetura

```
NAGV_BASE_PROD_SEAL  ← view principal enviada à integração SEAL
├── MRL_PRODEMPSEG          preço e segmento do produto por empresa
├── NAGV_BASE_ALL_PROMO     union de todos os tipos de promoção ativas
│   ├── NAGV_BASE_PROMOC_PDV_SEAL         promoções tabloide / "a partir de"
│   └── NAGV_PROMOC_ATIVAS_REGRAPDV_SEAL  regras de incentivo (Cartão Nagumo)
└── NAGF_PRECO_REFERENCIA   cálculo do preço de referência por unidade/peso
```

**Indicador de carga PDV (`IND_CARGA_PDV`):** gerado na camada mais externa da view — `'S'` quando a alteração do produto ocorreu **antes** da última carga bem-sucedida do [[PDV]] para a loja, garantindo que apenas dados já consolidados sejam enviados à integração.

---

## Objetos

### View Principal — `NAGV_BASE_PROD_SEAL`

View que consolida todos os dados de produto e preço enviados à [[SEAL]]. Cada linha representa um produto × empresa × tipo de preço.

**Colunas principais:**

| Coluna | Descrição |
|--------|-----------|
| `TIPO` | Código numérico do layout da etiqueta (1–6) — ver tabela de tipos abaixo |
| `DESC_TIPO` | Descrição do layout: `Preco Padrao`, `Oferta Tabloide`, `Meu Nagumo`, `Cartao Nagumo`, etc. |
| `NROEMPRESA` | Empresa (loja) |
| `PLU` | Código do produto (`SEQPRODUTO`) |
| `EAN` | Código de barras — EAN para não pesáveis, código `B` para pesáveis |
| `DESCCOMPLETA` | Descrição completa do produto |
| `PRECO_NORMAL` | Preço normal vigente (`PRECOVALIDNORMAL`) |
| `PRECO_2` | Preço promocional vigente (`PRECOVALIDPROMOC`) |
| `PRECO_3` | Preço da promoção ativa — nulo quando é tabloide puro |
| `STATUS_PROMOC` | Status da promoção (`A`/`I`) |
| `DTAALTERACAO` | Data da última alteração — base para o filtro incremental |
| `DTAINICIO` / `DTAFIM` | Vigência da promoção |
| `INFO_EMB_1/2/3` | Preço de referência por unidade/peso (ex: `"Nesta emb. 100g R$ 1,99"`) |
| `MARCA` | Marca do produto |
| `IND_CARGA_PDV` | `'S'` = alteração anterior à última carga PDV da loja; `'N'` = ainda não carregado |

**Tabela de tipos de etiqueta:**

| TIPO | DESC_TIPO | Condição |
|------|-----------|----------|
| 1 | Preço Padrão | Sem promoção ativa, ou tabloide ≥ preço normal |
| 2 | Oferta Tabloide | Promoção tabloide com preço menor que o normal |
| 3 | Meu Nagumo | Regra Meu Nagumo com preço menor que o normal |
| 4 | Meu Nagumo + Oferta | Regra Meu Nagumo com preço menor que o promocional vigente |
| 5 | Cartão Nagumo | Regra de incentivo (Cartão) com preço menor que o normal |
| 6 | Cartão Nagumo + Oferta | Regra de incentivo (Cartão) com preço menor que o promocional vigente |

**Filtros aplicados na view:**
- `S.PRECOVALIDNORMAL > 0` — apenas produtos com preço cadastrado
- `S.QTDEMBALAGEM = 1` — embalagem unitária
- `S.NROSEGMENTO = 2` — segmento principal
- `S.STATUSVENDA = 'A'` — produto ativo para venda
- `MAX_EMPRESA.NROSEGMENTOPRINC = S.NROSEGMENTO` — empresa vinculada ao segmento do produto

---

### View de Promoções Tabloide — `NAGV_BASE_PROMOC_PDV_SEAL`

Retorna promoções [[PDV]] do tipo "a partir de" (`MFL_PROMOCAOPDV`) com preço e quantidade mínima.

**Regras de inclusão:**
- Status `'A'` em promoção, item e empresa
- `TRUNC(SYSDATE) BETWEEN DTAINICIO AND DTAFIM + 1` — inclui o dia seguinte ao vencimento para envio da "saída" da promoção
- Ou `TRUNC(DTAALTERACAO) = TRUNC(SYSDATE)` — alterações do dia (mesmo fora do período)

**Lógica de `DTAALTERACAO`:**
```sql
GREATEST(
  CASE WHEN TRUNC(SYSDATE) > DTAFIM THEN TRUNC(SYSDATE) ELSE DATE '2000-01-01' END,
  X.DTAALTERACAO,
  XI.DTAALTERACAO
)
```
> Quando a promoção venceu ontem, força `DTAALTERACAO = SYSDATE` para garantir que a carga de "saída" seja enviada à [[SEAL]].

---

### View de Regras de Incentivo — `NAGV_PROMOC_ATIVAS_REGRAPDV_SEAL`

Retorna regras de incentivo do tipo `'F'` ([[Cartão Nagumo]]) vinculadas às formas de pagamento `92`, `93` e `24` (todas as três obrigatórias).

**Colunas principais:**

| Coluna | Descrição |
|--------|-----------|
| `PRECO_FINAL` | Preço calculado: `PRECOBASE - (PRECOBASE × PERCINCENTIVOPROD / 100)` ou `PRECOINCENTIVOEMB` se sem percentual |
| `STATUS` | `'A'` somente quando TIPOREGRA=`'F'`, formas de pagamento corretas, vigência ativa e todos os status `'A'` |
| `DTAALTERACAO` | `GREATEST` entre vencimento, alteração da regra, do produto e da empresa — mesmo mecanismo de "saída" da view de tabloide |

---

### Função de Preço de Referência — `NAGF_PRECO_REFERENCIA`

Calcula o preço por unidade de medida para exibição na etiqueta (ex: preço por 100g, por litro).

```sql
NAGF_PRECO_REFERENCIA(P_PRECO, P_MULTEQPEMB, P_UNIDADE)
```

| Unidade | Cálculo | Exemplo |
|---------|---------|---------|
| `GR` | `PRECO / MULTEQPEMB × 100` (se emb > 1) | 500g → preço/100g |
| `KG` | `PRECO / MULTEQPEMB` | preço por kg |
| `MG` | `PRECO / MULTEQPEMB × 100.000` | raro, altíssima precisão |
| `ML` | `PRECO / MULTEQPEMB × 0,1` | preço/100ml |
| `LI` | `PRECO / MULTEQPEMB` | preço por litro |
| `UN` | `PRECO` | sem conversão |

---

## Query de Integração

Chamada enviada à [[SEAL]] — incremental por padrão, carga full remove o filtro de data:

```sql
SELECT *
  FROM CONSINCO.NAGV_BASE_PROD_SEAL X
 WHERE NROEMPRESA = 62                          -- filtra empresa (loja destino)
   AND TRUNC(DTAALTERACAO) = TRUNC(SYSDATE)     -- apenas alterações do dia (remover para carga full)
   AND IND_CARGA_PDV = 'S';                     -- somente alterações anteriores à última carga PDV da loja
```

**Filtros e sua função:**

| Filtro | Propósito |
|--------|-----------|
| `NROEMPRESA = 62` | Isola uma loja — cada loja tem sua própria integração |
| `TRUNC(DTAALTERACAO) = TRUNC(SYSDATE)` | Incremental: só envia o que mudou hoje; remover para carga full inicial |
| `IND_CARGA_PDV = 'S'` | Garante consistência: preço já chegou ao [[PDV]] antes de ir para a etiqueta |

> **Carga full:** remover o filtro `TRUNC(DTAALTERACAO)` para reenviar toda a base da loja à [[SEAL]] (ex: primeira carga ou reparo de inconsistência).

---

## Alertas Relacionados

Erros da API [[SEAL]] são monitorados pelo bot [[Oracle Auto Reports - Whatsapp Bot]]:

| Objeto | Função |
|--------|--------|
| `NAGP_WTS_V2_LOG_API_SEAL` | Envia via [[WhatsApp]] os erros registrados em `NAGT_LOG_API_SEAL` |
| `NAGT_LOG_API_SEAL` | Tabela de log: `DTALOG`, `ERRO`, `INDLOGPROCESSADO` |
