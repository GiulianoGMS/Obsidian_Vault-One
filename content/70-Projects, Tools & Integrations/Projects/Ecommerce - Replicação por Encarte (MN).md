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

Replica as [[Oferta|ofertas]] de [[Encarte]] do **[[Meu Nagumo]]** para as tabelas de [[Promoção]] do [[PDV TOTVS]], gerando uma [[Promoção]] por **combinação de segmento + janela de vigência** presente no [[Encarte]]. Suporta expansão automática de itens por **[[Família]]** e/ou **similaridade**.

> [!info] Janelas de oferta (`MRL_ENCARTEJANELA`)
> Um mesmo [[Encarte]] pode ter **janelas** — subdivisões com vigência própria (`DTAVIGENCIAINI` / `DTAVIGENCIAFIM`) e nome independente. A view e a procedure respeitam essas datas: se um item possuir uma janela, suas datas e descrição substituem as da capa do encarte. O time **ainda não utiliza janelas** em produção, apenas datas, mas a estrutura já está preparada — quando forem usadas, cada janela gerará uma promoção separada no PDV (mais quebras).

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

### View `NAGV_BASE_MN_ENCARTE`

A view é a fonte de todos os dados consumidos pela procedure. Principais pontos:

**Join com janela (opcional):**
```sql
LEFT JOIN MRL_ENCARTEJANELA J
  ON J.SEQENCARTE = X.SEQENCARTE
 AND J.SEQJANELA  = P.SEQJANELA
 AND J.NROPAGINA  = P.NROPAGINA
```

**Datas e descrição resolvidas por prioridade janela → capa:**
```sql
NVL(P.DTAVIGENCIAINI, X.DTAINICIO)  AS DTAINICIO   -- data início: janela > capa
NVL(P.DTAVIGENCIAFIM, X.DTAFIM)     AS DTAFIM       -- data fim:   janela > capa
NVL(J.NOMEJANELA,     X.DESCRICAO)  (em DESC_PROMOC) -- descrição:  janela > capa
```

Ou seja: se o item tiver uma janela vinculada (`P.SEQJANELA` preenchido), a vigência e a descrição da promoção gerada virão da janela; caso contrário, usam as datas e descrição da capa do encarte.

**Formato de `DESC_PROMOC`:**
```
SEQENCARTE/SEGMENTO - DD a DD - NOMEJANELA (ou DESCRICAO da capa)
ex: "42580/NAG SP - 01 a 15 - Oferta de Frios"
```

---

### Fluxo — Loop por Segmento

Para cada combinação distinta de `(NROSEGMENTO, DTAINICIO, DTAFIM)` do [[Encarte]] (sem duplicidade em `MFL_PROMOCAOPDV`):

**1. Loop Capa** → `MFL_PROMOCAOPDV`

Cria um cabeçalho de [[Promoção]] por combinação `(segmento + DTAINICIO + DTAFIM)`, com `STATUS = 'A'` e descrição vinda de `DESC_PROMOC` da view. Se o mesmo segmento tiver produtos em janelas com datas diferentes, gerará **promoções separadas** (uma por janela).

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
| `NAGV_BASE_MN_ENCARTE` | Origem — view sobre `MRL_ENCARTE` / `MRL_ENCARTEPRODUTOPRECO` + janelas |
| `MRL_ENCARTE` | [[Encarte]] nativo do [[ERP]] — capa com `DTAINICIO`/`DTAFIM` e `DESCRICAO` padrão |
| `MRL_ENCARTEPRODUTO` | Itens do encarte — contém `SEQJANELA`/`NROPAGINA`/`DTAVIGENCIAINI`/`DTAVIGENCIAFIM` |
| `MRL_ENCARTEJANELA` | Janelas de oferta — vigência e nome específicos por janela dentro do encarte |
| `MFL_PROMOCAOPDV` | Destino — cabeçalho da [[Promoção]] por `(segmento + DTAINICIO + DTAFIM)` |
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
- [ ] View - Extração de Produtos por promoção - Ordenado por Categoria