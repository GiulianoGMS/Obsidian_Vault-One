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
  - "[[ST]]"
  - "[[Fiscal]]"
  - "[[CAT 28]]"
Date: 2026-06-30
Type: Ferramenta
---

> [!info] Referência
> View: [NAGV_APURACAO_CAT28_V3.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGV_APURACAO_CAT28_V3.sql)  
> Procedure: [NAGP_EXT_CAT28.prc](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_EXT_CAT28.prc)

---

## Visão Geral

Ferramenta de apuração periódica para **exclusão de produtos do regime de Substituição Tributária ([[CAT 28]]/SP)**. Gera arquivos TXT por loja com as [[alíquotas]] [[ST]] vigentes, usados para cálculo do estoque a destituir. O processo é executado por competência (mês de exclusão do produto do regime ST).

---

## Fluxo por Competência

```
1. Criar/popular tabela base de produtos (NAGT_PRODST_JULHO)
2. Verificar tabela De/Para de tributações (NAGT_DEPARA_TRIBUT_ST_v3)
3. Ajustar a view NAGV_APURACAO_CAT28_V3:
       → data corte de entrada de notas (DTAENTRADA)
       → data de destoque (DTAESTOQUE)
       → referência da tabela base
4. Executar NAGP_EXT_CAT28 em loop por empresa
       → gera Ext_ExclusaoCat28_LJ_XXX.txt no diretório EXT_CAT28
```

---

## Pré-requisitos por Competência

### 1. Tabela Base de Produtos

Cria a tabela com os produtos saindo do regime ST nesta competência. O nome muda por mês.

```sql
CREATE TABLE NAGT_PRODST_JULHO (SEQPRODUTO NUMBER(15));
SELECT * FROM NAGT_PRODST_JULHO FOR UPDATE;  -- popular via grid
```

> O nome da tabela segue o padrão `NAGT_PRODST_<MÊS>`. Exemplos: `NAGT_PRODST_ABRIL`, `NAGT_PRODST_JULHO`.

### 2. Tabela De/Para de Tributações

Mapeamento da [[tributação]] antiga (regime ST) para a nova (pós-exclusão):

```
NAGT_DEPARA_TRIBUT_ST_v3
  TRIBNOVA  → tributação atual do produto (campo NROTRIBUTACAO de MAP_FAMDIVISAO)
  TRIBANTIGA → tributação anterior (ST) usada para buscar a alíquota em MAP_TRIBUTACAOUF
```

Verificar se todos os [[produtos]] da tabela base têm entrada nesta tabela antes de gerar os arquivos.

### 3. Ajuste da View `NAGV_APURACAO_CAT28_V3`

Dois parâmetros devem ser atualizados na [[view]] a cada competência:

| Parâmetro | Descrição | Exemplo (Jul/2026) |
|-----------|-----------|-------------------|
| `DTAENTRADA < DATE '...'` | Data corte de entrada de NF — última NF antes da exclusão do regime | `DATE '2026-07-01'` |
| `CO.DTAESTOQUE = DATE '...'` | Data do estoque para destoque | `DATE '2026-06-30'` |

Também atualizar a referência da tabela/view de produtos na CTE `ULTNF` (ex: `NAGV_PRODST_ABRIL` → referência da competência atual).

---

## View `NAGV_APURACAO_CAT28_V3`

Consolida, por produto e loja, as alíquotas ST (antiga tributação) e o [[estoque]] na data de destoque.

**Lógica de alíquota:**
- **SP → SP** (intraestadual): `Z.PERALIQUOTA` da `MAP_TRIBUTACAOUF` (`UFCLIENTEFORNEC = 'SP'`)
- **Fora de SP** (interestadual): `Y.PERALIQUOTA` da `MAP_TRIBUTACAOUF` (`UFCLIENTEFORNEC = UF do fornecedor`)
- Fallback: `XI.PERALIQUOTAICMSSTDISTRIB` da última NF de entrada

**CTE `ULTNF`:** última NF de entrada por produto/empresa com `DTAENTRADA` antes da data corte, via `ROW_NUMBER() OVER (PARTITION BY SEQPRODUTO, NROEMPRESA ORDER BY SEQNF DESC)`.

**Filtros:**
- Apenas produtos da tabela base (`NAGT_PRODST_JULHO`)
- Exclui lojas 36 e 53
- Estoque > 0 na data de destoque
- Pelo menos uma alíquota ST > 0

**Formato da linha gerada (`LINHA_ARQ`):**
```
SEQPRODUTO;ALIQUOTA_SP;ALIQUOTA_INTER
```

---

## Procedure `NAGP_EXT_CAT28`

Gera o arquivo TXT de exclusão por empresa.

```sql
NAGP_EXT_CAT28(psNroEmpresa NUMBER)
```

- Abre `Ext_ExclusaoCat28_LJ_<NNN>.txt` no diretório Oracle `EXT_CAT28`
- Escreve uma linha por registro de `NAGV_APURACAO_CAT28_V3` filtrado pela loja
- Fecha o arquivo; em caso de erro, fecha antes de relançar a exceção

**Loop de execução por empresa:**
```sql
BEGIN
  FOR bs IN (SELECT DISTINCT NROEMPRESA FROM NAGV_APURACAO_CAT28_V3) LOOP
    NAGP_EXT_CAT28(bs.NROEMPRESA);
  END LOOP;
END;
```

> **Diretório**: /u02/arquivos/TI/ExclusaoCat28

---

## Crítica de Devolução (`ESPV_CRITICADEVNFFORN`)

Adicionada em 01/07/2026. Bloqueia itens CAT 28 em devoluções de NF com referência emitida antes de 01/07/2026.

**Código de crítica:** `17`  
**Tipo:** `INDBLOQUEIOLIBERA = 'B'` (bloqueio total)

```sql
UNION ALL
SELECT A.IDSESSION, A.INST_ID, A.SEQNFDEVFORNEC, A.SEQPRODUTO,
       17 CODCRITICA,
       'ST - Não é permitido emitir o item '||A.SEQPRODUTO||
       ' com nota referenciada/emissão antes de 01/07/2026.' MENSAGEM,
       'B' INDBLOQUEIOLIBERA
  FROM MFLX_NFDEVFORNEC A
       INNER JOIN MLF_NOTAFISCAL X ON X.SEQNF = A.SEQNFREF
       INNER JOIN NAGT_PRODST_JULHO C ON C.SEQPRODUTO = A.SEQPRODUTO
 WHERE X.DTAEMISSAO < DATE '2026-07-01'
   AND A.NROEMPRESA NOT IN (36,53)
```

> [!note] Crítica de Recebimento
> A crítica em `MLFV_AUXNOTAFISCALINCONS` **não é mais necessária** — as NFs são recalculadas com a tributação atual no recebimento.

---

## Melhoria na Rotina de Apuração ERP

Para que o ERP processe apenas os produtos em apuração (sem varrer todos os itens ST):

| Objeto | Ação |
|--------|------|
| `mrlv_nfapuraimposto` | View padrão do ERP — alterar para usar a view Nagumo |
| `mlfv_nfbasecomplst_nag` | View Nagumo — adicionar `INNER JOIN NAGT_PRODST_JULHO` para corte direto nos produtos desta competência |

O INNER JOIN com a tabela base elimina o processamento de todos os outros produtos ST, reduzindo tempo e escopo da apuração.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `NAGT_PRODST_<MÊS>` | Tabela | Produtos excluídos do regime ST na competência (ex: `NAGT_PRODST_JULHO`) |
| `NAGT_DEPARA_TRIBUT_ST_v3` | Tabela | De/Para de tributações: `TRIBNOVA` (atual) → `TRIBANTIGA` (ST anterior) |
| `NAGV_APURACAO_CAT28_V3` | View | Consolida alíquotas ST e estoque por produto/loja para geração do arquivo |
| `NAGP_EXT_CAT28` | Procedure | Gera `Ext_ExclusaoCat28_LJ_XXX.txt` por empresa no diretório `EXT_CAT28` |
| `ESPV_CRITICADEVNFFORN` | View | Crítica de devolução — bloqueia devoluções com NF referenciada anterior ao corte |
| `mrlv_nfapuraimposto` | View (ERP) | Rotina de apuração do ERP — alterada para usar view Nagumo |
| `mlfv_nfbasecomplst_nag` | View | View Nagumo com INNER JOIN na tabela base para corte por competência |
| `MAP_TRIBUTACAOUF` | Tabela | Alíquotas ST por tributação, UF e regime — fonte das alíquotas antigas |
| `FATO_ESTOQUE` | Tabela | Estoque histórico — consultado na `DTAESTOQUE` da competência |
