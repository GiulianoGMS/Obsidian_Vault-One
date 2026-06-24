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
  - "[[Reforma Tributária]]"
  - "[[CBS]]"
  - "[[IBS]]"
  - "[[Recebimento]]"
Date: 2026-06-18
Type:
Project:
---

> [!info] Referência
> Repositório: [GiulianoGMS/DDL-Objects-Oracle — NAGP_PALIATIVO_CORRIGE_IMPOSTOS.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CORRIGE_IMPOSTOS.sql)
> Chamada em: `PKG_MLF_RECEBIMENTO` linha 7513

---

## Visão Geral

Procedure de ajuste chamada automaticamente durante o recebimento de NF-e. Concentra todos os paliativos necessários para corrigir impostos da **Reforma Tributária (CBS/IBS)** e outros cenários não tratados corretamente pela versão padrão do ERP Consinco.

O objetivo é garantir que os valores de CBS, IBS-UF, IBS-Mun, IPI e ICMS Desonerado fiquem consistentes nos itens (`MLF_AUXNFITEM`) e na capa (`MLF_AUXNOTAFISCAL`) antes de seguir o fluxo de recebimento.

---

## Ponto de Entrada

```sql
-- PKG_MLF_RECEBIMENTO — linha 7513
NAGP_PALIATIVO_CORRIGE_IMPOSTOS(pnSeqAuxNotaFiscal);
```

**Parâmetro:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `psSeqAuxNotaFiscal` | `MLF_AUXNOTAFISCAL.SEQAUXNOTAFISCAL%TYPE` | Chave da NF-e em processamento |

---

## Variáveis de Contexto

No início, a procedure busca o contexto da nota para decidir quais paliativos aplicar:

| Variável | Fonte | Uso |
|----------|-------|-----|
| `psSeqPessoa` | `MLF_AUXNOTAFISCAL.SEQPESSOA` | Identifica empresa do grupo (`< 999`) |
| `psStatusNT` | `MAX_EMPRESANOTATECNICA` | Nota Técnica 2025002 ativa para o emissor |
| `psCBS / psIBS` | `TMP_M000_NF` | Se o XML do fornecedor veio com CBS/IBS |
| `psCGO` | `MAX_CODGERALOPER` | Código Geral de Operação da nota |
| `psCNPJ` | `GE_PESSOA.NROCGCCPF` | CNPJ do fornecedor |
| `psTipDoc` | `MAX_CODGERALOPER.TIPDOCFISCAL` | `'D'` = devolução |
| `pdTipPed` | `MAX_CODGERALOPER.TIPPEDIDOCOMPRA` | Tipo do pedido de compra |
| `psIndImp` | `MAX_EMPRESA.INDIMPORTADORA` | `'I'` = empresa importadora |
| `psIndProdRural` | `GE_PESSOA.INDPRODRURAL` | `'S'` = produtor rural |

---

## Paliativos

### Paliativo 1 — Zera CBS/IBS (grupo não ativo ou fornecedor não emite)

**Quando executa:** Uma das condições abaixo:
- Emissor é empresa do grupo (`SEQPESSOA < 999`) **E** NT 2025002 **não está ativa** para ele
- **OU** fornecedor não informou CBS/IBS no XML (`psCBS = 0 OR psIBS = 0`) **E** ainda antes de `2026-06-30` **E** empresa não é importadora (`INDIMPORTADORA != 'I'`)

**O que faz:**

```sql
-- Zera itens
UPDATE MLF_AUXNFITEM SET VLRBASECBS=0, VLRIMPOSTOCBS=0,
                         VLRBASEIBSUF=0, VLRIMPOSTOIBSUF=0,
                         VLRBASEIBSMUN=0, VLRIMPOSTOIBSMUN=0
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;

-- Zera capa
UPDATE MLF_AUXNOTAFISCAL SET VLRBASECBS=0, VLRIMPOSTOCBS=0,
                             VLRBASEIBSUF=0, VLRIMPOSTOIBSUF=0,
                             VLRBASEIBSMUN=0, VLRIMPOSTOIBSMUN=0
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

> [!info] Lógica da NT 2025002
> A Nota Técnica 2025002 controla quais emissores do grupo já estão obrigados a emitir CBS/IBS. Enquanto não ativada para o emissor, os impostos são zerados na entrada para evitar duplicidade.

---

### Paliativo 2 — Atualiza CBS/IBS do XML (transferências do grupo)

**Quando executa:** Cai no `ELSIF 1=1` (complementar ao Paliativo 1). O ajuste só é feito se o CGO da nota estiver cadastrado no parâmetro dinâmico `CGO_REP_XML_REFORMA`.

**Parâmetro dinâmico:**

| PD | Descrição |
|----|-----------|
| `CGO_REP_XML_REFORMA` | Lista de CGOs que devem replicar os valores CBS/IBS do XML, mantendo dados do emissor, nas transferências entre lojas do grupo |

**O que faz:**

1. Lê os valores CBS/IBS do XML (`TMP_M014_ITEM`) por produto
2. Identifica o código do produto no ERP via `MAP_PRODCODIGO` (código de acesso ou EAN), considerando o CNPJ do fornecedor
3. Para produtos com **múltiplas linhas no item** (`psQtdRep > 1`): **rateia** os valores pelo critério de quantidade:
   - Se a embalagem do XML for `KG` e o item está em unidade, aplica o `PESOLIQUIDO` como fator
   - Se a embalagem for `UN`, `CR`, `UN1`, `KG`, `CP`: divide por 1; caso contrário, divide por `QTDEMBALAGEM`
4. Para itens sem repetição: usa o valor cheio do XML (`BaseCBSCheio`, `BaseIBSUFCheio`, etc.)
5. Atualiza a **capa** com os valores totais do XML
6. **Arredondamento de centavos:** se a diferença entre a soma dos itens e a capa for ≤ R$ 0,10 em qualquer imposto, ajusta o último item (via `ROWID`) para absorver a diferença

> [!warning] Sem COMMIT antes do loop
> O COMMIT ocorre após o loop de itens e o de capa, garantindo que os dois updates sejam atômicos.

---

### Paliativo 3 — Zera IPI para empresas importadoras (entradas de lojas)

**Quando executa:** Função `NAGF_EmpImportadora(psSeqPessoa)` retorna `'I'` **E** parâmetro `REC_IND_ZERA_IPI_IMP = 'S'`.

**O que faz:**

```sql
UPDATE MLF_AUXNFITEM SET VLRIPI=0, BASCALCIPI=0, PERALIQUOTAIPI=0
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;

UPDATE MLF_AUXNOTAFISCAL SET VLRIPI=0
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

**Parâmetro dinâmico:**

| PD | Descrição |
|----|-----------|
| `REC_IND_ZERA_IPI_IMP` | `'S'` = zera IPI na entrada de notas emitidas por empresa importadora do grupo |

> [!note] Contexto
> Empresas importadoras do grupo calculam IPI na emissão. Na entrada na loja destino, o ERP recalcula o IPI mesmo sendo transferência interna, gerando duplicidade. Este paliativo corrige zerando na entrada.

---

### Paliativo 6 — Corrige Despesa Fora NF para Importação *(fora de ordem no código)*

**Quando executa:** `INDIMPORTADORA = 'I'` **E** parâmetro `IMP_INDCORRIGEDESPFORANF = 'S'` **E** `CGO = 5`.

**O que faz:** Soma o total de `VLRDESPFORANF` dos itens e atualiza a capa, evitando subcontar quando o ERP não totaliza corretamente a despesa CBS+IBS da DI.

```sql
UPDATE MLF_AUXNOTAFISCAL
   SET VLRDESPFORANF = CASE
         WHEN NVL(VLRDESPFORANF,0) >= psVlrTotDespForaNF
         THEN NVL(VLRDESPFORANF,0)
         ELSE NVL(VLRDESPFORANF,0) + psVlrTotDespForaNF
       END
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

**Parâmetro dinâmico:**

| PD | Descrição |
|----|-----------|
| `IMP_INDCORRIGEDESPFORANF` | `'S'` = soma CBS+IBS da DI no campo Despesa Fora NF da capa |

---

### Paliativo 4 — Corrige ICMS Desonerado na devolução (CGOs específicos)

**Quando executa:** `CGO IN (103, 18, 55)` **E** `SYSDATE < 2026-04-01`.

**O que faz:** Zera ICMS Desonerado nos itens, pois a alteração de CGO no recebimento recalculava e sobrescrevia o valor vigente.

```sql
UPDATE MLF_AUXNFITEM
   SET INDCALCICMSDESONOUTROS=0, VLRTOTICMSDESONERADO=0, MOTIVODESONERACAOICMS=NULL
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

> [!warning] Prazo expirado
> Condição `TRUNC(SYSDATE) < DATE '2026-04-01'` — este paliativo **não executa mais** após abril de 2026. Validar se pode ser removido.

---

### Paliativo 5 — Zera ICMS Desonerado em devoluções do grupo

**Quando executa:** `TIPDOCFISCAL = 'D'` (devolução) **E** `SEQPESSOA < 999` (empresa do grupo).

**O que faz:** Zera motivo e valor de ICMS Desonerado nos itens. A lista de CGOs vem do parâmetro `DEV_CGO_ZERA_DESON`, mas há um `OR 1=1` que faz aplicar sempre independente do CGO.

```sql
UPDATE MLF_AUXNFITEM
   SET MOTIVODESONERACAOICMS=NULL, VLRTOTICMSDESONERADO=0
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

**Parâmetro dinâmico:**

| PD | Descrição |
|----|-----------|
| `DEV_CGO_ZERA_DESON` | Lista de CGOs que zeram ICMS Desonerado em devoluções do grupo (atualmente ignorado pelo `OR 1=1`) |

> [!tip] `OR 1=1` ativo
> O `IF psCGORegra IS NOT NULL OR 1=1` faz o bloco executar para **todas** as devoluções do grupo, independente do CGO. O parâmetro `DEV_CGO_ZERA_DESON` existe mas não filtra de fato.

---

### Paliativo 7 — Recalcula Prod Rural

**Quando executa:** `INDPRODRURAL = 'S'` **E** `CGO != 900`.

**O que faz:** Força o ERP a recalcular cenários fiscais de produtor rural que não estavam sendo aplicados na versão atual, resetando flags de controle:

```sql
UPDATE MLF_AUXNOTAFISCAL SET INDIMPXML='N'
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;

UPDATE MLF_AUXNFITEM SET INDMANUTENCAO='R'
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal;
```

> [!note]
> `INDIMPXML = 'N'` instrui o ERP a ignorar os valores do XML e recalcular. `INDMANUTENCAO = 'R'` indica manutenção/recalc obrigatório no item.

---

### Paliativo 8 — Zera base e imposto negativos (CBS / IBS-UF / IBS-Mun)

**Quando executa:** Sempre (`IF 1=1`).

**O que faz:** Garante que nenhum campo de base ou valor de CBS/IBS fique **negativo** nos itens. Abrange tanto os campos de valor do imposto quanto as bases de cálculo.

```sql
UPDATE MLF_AUXNFITEM
   SET VLRIMPOSTOCBS    = CASE WHEN VLRIMPOSTOCBS    < 0 THEN 0 ELSE VLRIMPOSTOCBS    END,
       VLRIMPOSTOIBSMUN = CASE WHEN VLRIMPOSTOIBSMUN < 0 THEN 0 ELSE VLRIMPOSTOIBSMUN END,
       VLRIMPOSTOIBSUF  = CASE WHEN VLRIMPOSTOIBSUF  < 0 THEN 0 ELSE VLRIMPOSTOIBSUF  END,
       VLRBASECBS       = CASE WHEN VLRBASECBS        < 0 THEN 0 ELSE VLRBASECBS       END,
       VLRBASEIBSMUN    = CASE WHEN VLRBASEIBSMUN     < 0 THEN 0 ELSE VLRBASEIBSMUN    END,
       VLRBASEIBSUF     = CASE WHEN VLRBASEIBSUF      < 0 THEN 0 ELSE VLRBASEIBSUF     END
WHERE SEQAUXNOTAFISCAL = psSeqAuxNotaFiscal
  AND (VLRIMPOSTOCBS < 0 OR VLRIMPOSTOIBSUF < 0 OR VLRIMPOSTOIBSMUN < 0
       OR VLRBASECBS < 0 OR VLRBASEIBSMUN < 0 OR VLRBASEIBSUF < 0);
```

**Campos corrigidos:**

| Campo | Tipo | Imposto |
|-------|------|---------|
| `VLRIMPOSTOCBS` | Valor | Contribuição sobre Bens e Serviços |
| `VLRIMPOSTOIBSUF` | Valor | IBS — parcela Estadual (UF) |
| `VLRIMPOSTOIBSMUN` | Valor | IBS — parcela Municipal |
| `VLRBASECBS` | Base | Base de cálculo CBS |
| `VLRBASEIBSUF` | Base | Base de cálculo IBS — UF |
| `VLRBASEIBSMUN` | Base | Base de cálculo IBS — Municipal |

> [!info] Por que negativos ocorrem?
O motivo de a nota ter gerado valor da base CBS/IBS negativo foi que o fornecedor enviou um valor de PIS/COFINS no XML muito alto e, quando foi subtraído esse valor da fórmula, gerou uma base negativa.
 

> [!tip] Filtro de performance
> O `WHERE` inclui `AND (... < 0)` para limitar o UPDATE apenas às linhas que realmente precisam de correção, evitando lock desnecessário em NFs sem problema.

---

## Fluxo Geral de Execução

```
Recebe SEQAUXNOTAFISCAL
        │
        ▼
Busca contexto (fornecedor, NT 2025002, CBS/IBS do XML, CGO, CNPJ, tipDoc, importadora, prodRural)
        │
        ├─ Paliativo 1 ─ Zera CBS/IBS (grupo sem NT ativa ou fornecedor sem XML)
        │
        ├─ Paliativo 2 ─ Replica CBS/IBS do XML com rateio por embalagem/peso (grupo, CGO no PD)
        │
        ├─ Paliativo 3 ─ Zera IPI (empresa importadora, PD habilitado)
        │
        ├─ Paliativo 6 ─ Corrige Despesa Fora NF (importadora, CGO=5, PD habilitado)
        │
        ├─ Paliativo 4 ─ Zera ICMS Desonerado (CGO 103/18/55, até 2026-04-01) ← EXPIRADO
        │
        ├─ Paliativo 5 ─ Zera ICMS Desonerado devoluções do grupo (tipDoc='D', seqPessoa<999)
        │
        ├─ Paliativo 7 ─ Recalcula Prod Rural (prodRural='S', CGO≠900)
        │
        └─ Paliativo 8 ─ Zera impostos negativos CBS/IBS (sempre)
```

---

## Parâmetros Dinâmicos (`SP_BUSCAPARAMDINAMICO`)

| Parâmetro | Paliativo | Descrição |
|-----------|-----------|-----------|
| `CGO_REP_XML_REFORMA` | 2 | Lista de CGOs que replicam CBS/IBS do XML nas transferências do grupo |
| `REC_IND_ZERA_IPI_IMP` | 3 | `'S'` = zera IPI na entrada de notas de empresa importadora |
| `IMP_INDCORRIGEDESPFORANF` | 6 | `'S'` = corrige Despesa Fora NF na nota de importação |
| `DEV_CGO_ZERA_DESON` | 5 | Lista de CGOs que zeram ICMS Desonerado em devoluções do grupo |

---

## Objetos de Banco Utilizados

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `MLF_AUXNOTAFISCAL` | Tabela | Cabeçalho da NF-e auxiliar (dados da nota) |
| `MLF_AUXNFITEM` | Tabela | Itens da NF-e auxiliar (por produto) |
| `TMP_M000_NF` | Tabela temp | Dados do XML da NF-e (totais) |
| `TMP_M014_ITEM` | Tabela temp | Itens do XML da NF-e (por item) |
| `MAX_CODGERALOPER` | Tabela | Código Geral de Operação e configurações |
| `MAX_EMPRESA` | Tabela | Cadastro de empresas (flag importadora) |
| `MAX_EMPRESANOTATECNICA` | Tabela | Notas técnicas ativas por empresa |
| `GE_PESSOA` | Tabela | Cadastro de pessoas (CNPJ, prodRural) |
| `MAP_PRODCODIGO` | Tabela | De-para código de acesso → produto ERP |
| `MAP_PRODUTO` | Tabela | Cadastro de produtos |
| `MAP_FAMILIA` | Tabela | Famílias de produtos (flag pesável) |
| `MAP_FAMEMBALAGEM` | Tabela | Embalagens por família (peso líquido) |
| `NAGF_EmpImportadora` | Função | Retorna `'I'` se empresa é importadora |
| `SP_BUSCAPARAMDINAMICO` | Procedure | Leitura de parâmetros dinâmicos |
| `C5_COMPLEXIN.C5INTABLE` | Função | Converte string CSV em TABLE para uso no IN |
| `PKG_MLF_RECEBIMENTO` | Package | Ponto de chamada (linha 7513) |

---

## Pendências

- [ ] Remover ou avaliar Paliativo 4 (condição `SYSDATE < 2026-04-01` já expirou)
- [ ] Avaliar retirada do `OR 1=1` no Paliativo 5 e ativar filtro por CGO via parâmetro `DEV_CGO_ZERA_DESON`
- [ ] Confirmar com fiscal se o Paliativo 1 deve continuar zerando CBS/IBS após `2026-06-30`
- [ ] Avaliar se Paliativo 7 cobre todos os cenários de Prod Rural na versão atual

---

## Notas de Implementação

> [!warning] EXCEPTION silenciosa
> O bloco `EXCEPTION WHEN OTHERS` usa apenas `DBMS_OUTPUT` e **não relança a exceção**. Se a procedure falhar, o recebimento continua sem os ajustes. Monitorar logs em ambiente de testes.

> [!tip] Ordem de execução dos paliativos
> O Paliativo 6 está posicionado antes do 4 no código (comentado "fora de ordem rs"). A ordem lógica de negócio é: 1 → 2 → 3 → 6 → 4 → 5 → 7 → 8.

> [!info] Paliativo 8 é o mais recente
> Adicionado para cobrir o efeito colateral do rateio do Paliativo 2 em notas com muitos itens ou embalagens fracionadas, onde o cálculo por unidade gerava CBS/IBS ligeiramente negativo após arredondamento.
