---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Ecommerce]]"
  - "[[PDV]]"
Date:
Type: "[[Procedure]]"
Project: "[[Ecommerce - Replicação por Encarte (MN)]]"
tags:
  - Projects
---
### Visão Geral

> **Em fase de testes.** Este objeto é o sucessor da [[Ecommerce - Replicação de Ofertas PDV TOTVS|NAGP_REP_ECOMMERCE]]. A tabela legado `NAGT_REMARCAPROMOCOES` deixa de ser necessária — a origem passa a ser a view `NAGV_BASE_MN_ENCARTE`, construída sobre as tabelas nativas de [[Encarte]] do [[ERP]] (`MRL_ENCARTE` / `MRL_ENCARTEPRODUTOPRECO`).

Replica as [[Oferta|ofertas]] de [[Encarte]] do **[[Meu Nagumo]]** para as tabelas de [[Promoção]] do [[PDV TOTVS]], gerando uma [[Promoção]] por segmento presente no [[Encarte]]. Suporta expansão automática de itens por **[[Família]]** e/ou **similaridade**.

---

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `psSeqEncarte` | NUMBER | Sequencial do [[Encarte]] a replicar (`MRL_ENCARTE.SEQENCARTE`) |
| `psIndRepFam` | VARCHAR2 | `'S'` = expande para todos os produtos da [[Família]] · `'N'` = apenas o produto do [[Encarte]] |
| `psIndRepSim` | VARCHAR2 | `'S'` = expande para produtos similares · `'N'` = não expande |

---

### Diferenças em relação à NAGP_REP_ECOMMERCE

| Aspecto | NAGP_REP_ECOMMERCE (legado) | NAGP_MN_ENCARTE (novo) |
|---------|----------------------------|------------------------|
| Origem dos dados | `NAGT_REMARCAPROMOCOES` ([[Remarca]]) | `NAGV_BASE_MN_ENCARTE` (view sobre [[ERP]]) |
| Chave de entrada | `CODPROMOCAO` + `DATA` | `SEQENCARTE` |
| Loop externo | Nenhum | Por segmento (`NROSEGMENTO`) |
| Descrição da [[Promoção]] | `'MEU NAGUMO - ' \|\| CODPROMOCAO` | `DESC_PROMOC` (vem da view) |
| Status da capa | `'I'` se > 100 dias, `'A'` caso contrário | Sempre `'A'` |
| Expansão de itens | Produto exato (via [[EAN]]) | Produto, [[Família]] e/ou similar |
| `USUALTERACAO` | `'REP_AUTO'` | `'MN_ENCARTE'` |

---

### Fluxo — Loop por Segmento

Para cada `NROSEGMENTO` do [[Encarte]] (sem duplicidade em `MFL_PROMOCAOPDV`):

**1. Loop Capa** → `MFL_PROMOCAOPDV`

Cria um cabeçalho de [[Promoção]] por segmento, com `STATUS = 'A'` e descrição vinda de `DESC_PROMOC` da view.

**2. Loop Item** → `MFL_PROMOCPDVITEM`

Monta o conjunto de produtos com base nos parâmetros `psIndRepFam` e `psIndRepSim`:

| Cenário | `psIndRepFam` | `psIndRepSim` | Produtos incluídos |
|---------|--------------|--------------|---------------------|
| Produto exato | `N` | `N` | Apenas o produto do [[Encarte]] |
| Expansão [[Família]] | `S` | `N` | Todos os produtos da mesma [[Família]] |
| Expansão similar | `N` | `S` | Todos os similares via `MAP_PRODSIMILAR` |
| [[Família]] + Similar | `S` | `S` | Todos os produtos da [[Família]] que possuem similares |

**3. Loop Item_Loja** → `MFL_PROMOCPDVDESCAPARTDE`

Insere desconto por [[Loja]] usando preço do [[Encarte]] (`PRECO_MN`) vs. preço normal vigente:

```
VLRDESCONTO  = PRECOVALIDNORMAL − PRECO_MN
PERCDESCONTO = ((PRECOVALIDNORMAL − PRECO_MN) / PRECOVALIDNORMAL) × 100
```

> Para produtos **pesáveis**: `QTDAPARTIRDE = 0.01` · Para os demais: `QTDAPARTIRDE = 1`
> Só replica [[Loja|lojas]] onde `PRECO_MN < PRECOVALIDNORMAL`.

**4. Loop Empresa** → `MFL_PROMOCPDVEMP`

Vincula as [[Loja|lojas]] do segmento à [[Promoção]] gerada.

---

### Tabelas Envolvidas

| Tabela / View | Papel |
|---------------|-------|
| `NAGV_BASE_MN_ENCARTE` | Origem — view sobre `MRL_ENCARTE` / `MRL_ENCARTEPRODUTOPRECO` |
| `MRL_ENCARTE` | [[Encarte]] nativo do [[ERP]] (substituiu `NAGT_REMARCAPROMOCOES`) |
| `MFL_PROMOCAOPDV` | Destino — cabeçalho da [[Promoção]] por segmento |
| `MFL_PROMOCPDVITEM` | Destino — itens da [[Promoção]] |
| `MFL_PROMOCPDVDESCAPARTDE` | Destino — descontos e preços por [[Loja]] |
| `MFL_PROMOCPDVEMP` | Destino — [[Loja|lojas]] vinculadas |
| `MAP_PRODUTO` / `MAP_FAMILIA` | Expansão por [[Família]] e verificação de pesável |
| `MAP_PRODSIMILAR` | Expansão por similaridade |
| `MRL_PRODEMPSEG` | Preço normal vigente por empresa/segmento |

---

### Objetos Relacionados

- [[Ecommerce - Replicação de Ofertas PDV TOTVS]] — versão legado que esta procedure substitui
- [Procedure — NAGP_MN_ENCARTE](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_MN_ENCARTE.prc)
- [Procedure — NAGP_ATUALIZA_ENCARTE](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_ATUALIZA_ENCARTE.prc)

### Teste:

Encarte **42580**
Promoc PDV **24383**

### Pendências: 

- [x] View por Produto

![[Pasted image 20260617154105.png]]
![[Pasted image 20260617154229.png]]

- [ ] Criar encarte por periodo
- [ ] View para antecipação da promoção