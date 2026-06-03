---
Language:
  - "[[SQL]]"
  - "[[Python]]"
Repository:
  - "[[BLB]]"
  - "[[GMS-Corp/Python]]"
Squads:
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[NF-e]]"
  - "[[SPED]]"
  - "[[Extracao CSV]]"
Type: "[[Procedure]]"
tags:
  - Projects
---

[Repositório no GitHub →](https://github.com/GiulianoGMS/BLB)

Extração fiscal por empresa e período em arquivos CSV, cobrindo **[[NF-e]] de saída**, **[[NF-e]] de entrada** e **Cupons [[SAT]]/CF**. Os arquivos são gerados no servidor via UTL_FILE e usados para apuração/auditoria fiscal (layout compatível com [[SPED]] — [[NCM]], [[CEST]], [[CFOP]], [[CST]] ICMS/PIS/COFINS).

---

## Objetos

| Objeto | Tipo | Descrição |
|--------|------|-----------|
| `NAGV_BLB_SAIDAS` | VIEW | Consolidada de saídas: UNION de cupons fiscais (`MFL_DOCTOFISCAL`) e [[NF-e]] (`MLF_NOTAFISCAL`) |
| `NAGV_BLB_ENTRADAS` | VIEW | Entradas [[NF-e]] (`MLF_NOTAFISCAL`, `TIPNOTAFISCAL = 'E'`); inclui colunas extras de [[ICMS-ST]] |
| `NAGV_BLB_CUPONS_SAT` | VIEW | Apenas cupons [[SAT]]/CF (`MFL_DOCTOFISCAL`, `SERIEDF = 'CF'`) |
| `NAGP_BLB_EXT_SAIDAS` | PROCEDURE | Exporta `NAGV_BLB_SAIDAS` para CSV por empresa e período |
| `NAGP_BLB_EXT_ENTRADAS` | PROCEDURE | Exporta `NAGV_BLB_ENTRADAS` para CSV por empresa e período |
| `NAGP_BLB_EXT_CUPONS_SAT` | PROCEDURE | Exporta `NAGV_BLB_CUPONS_SAT` para CSV (todas as empresas) |

---

### Views — Fontes de Dados

#### NAGV_BLB_SAIDAS
UNION ALL de dois blocos:

| Bloco | Tabela base | Filtros |
|-------|-------------|---------|
| Cupons/CF | `MFL_DOCTOFISCAL` + `MFL_DFITEM` | `STATUSDF = 'V'` · `STATUSITEM = 'V'` · chave presente em `NAGT_XML_EXTRAIDO` (excl. Ent/Orc) |
| [[NF-e]] | `MLF_NOTAFISCAL` + `MLF_NFITEM` | `STATUSNF = 'V'` · `STATUSNFE = '4'` · `TIPNOTAFISCAL = 'S'` · `MODELONF IN (55,65)` · exclui série CF e CGOs internos |

#### NAGV_BLB_ENTRADAS
| Tabela base                     | Filtros                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `MLF_NOTAFISCAL` + `MLF_NFITEM` | `STATUSNF = 'V'` · `TIPNOTAFISCAL = 'E'` · exclui série CF e CGOs internos |

> Entradas tem 3 colunas extras ausentes em Saídas: `VLRICMSST`, `VLRICMSSTRETIDO`, `VLRICMSSUBS` ([[ICMS-ST]])

### NAGV_BLB_CUPONS_SAT
| Tabela base | Filtros |
|-------------|---------|
| `MFL_DOCTOFISCAL` + `MFL_DFITEM` | `STATUSDF = 'V'` · `SERIEDF = 'CF'` · CGO com finalidade de venda em `NAGV_BASE_CGO_FINALIDADE` |

---

## Procedures de Extração

### Parâmetros comuns (NAGP_BLB_EXT_SAIDAS e NAGP_BLB_EXT_ENTRADAS)

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `vsDtaInicial` | DATE | Data inicial do período (ex: `DATE '2026-03-01'`) |
| `vsDtaFinal` | DATE | Data final do período (ex: `DATE '2026-03-31'`) |
| `psNroEmpresa` | NUMBER | Número da empresa/[[Loja]] |

### Lógica de geração (compartilhada pelas 3 procedures)

1. Itera sobre meses do intervalo usando `DIM_TEMPO` (agrupa por `ANOMESDESCRICAO`, calcula primeiro e último dia do mês)
2. Gera **um arquivo por mês** dentro do período informado
3. Cabeçalho extraído dinamicamente de `ALL_TAB_COLUMNS` (ordem `COLUMN_ID`, excluindo `NROEMPRESA`)
4. Escrita em buffer CLOB de 32 KB via UTL_FILE — grava em chunks para suportar volumes grandes
5. Fecha o arquivo e faz COMMIT ao final de cada mês

### Diretórios e nomes de arquivo

| Procedure                 | Diretório Oracle     | Nome do arquivo                        |
| ------------------------- | -------------------- | -------------------------------------- |
| `NAGP_BLB_EXT_SAIDAS`     | `EXT_SAT_LOJA_{NNN}` | `Ext_BLB_SAIDAS_{NNN}_{MES_ANO}.csv`   |
| `NAGP_BLB_EXT_ENTRADAS`   | `EXT_SAT_LOJA_{NNN}` | `Ext_BLB_ENTRADAS_{NNN}_{MES_ANO}.csv` |
| `NAGP_BLB_EXT_CUPONS_SAT` | `BLB_SAT`            | `Ext_BLB_Cupons_SAT_{MES_ANO}.csv`     |

> `{NNN}` = empresa com 3 dígitos, zero-padded (ex: empresa 1 → `001`). `{MES_ANO}` = `ANOMESDESCRICAO` com `/` substituído por `_` (ex: `MAR_2026`).

> `NAGP_BLB_EXT_CUPONS_SAT` **não recebe `psNroEmpresa`** — extrai todas as empresas em um único arquivo por mês.

---

## Colunas Exportadas

Todas as 3 extrações compartilham o mesmo layout base (47 colunas). Entradas tem 3 adicionais ao final.

| # | Coluna | Descrição |
|---|--------|-----------|
| 1 | `PERIODO` | Data de movimento/emissão |
| 2 | `CHAVE` / `CHAVE_CFE` | Chave de acesso [[NF-e]] ou CFe |
| 3 | `SITUACAO` | `Autorizado` ou `Cancelado` |
| 4 | `SERIE` | Série do documento |
| 5 | `NUMERO_DOC` / `NUMERO_CFE` | Número do documento |
| 6 | `DTAEMISSAO` | Data de emissão |
| 7 | `NRO_CAIXA` | Número do checkout ([[SAT]]/CF); NULL para [[NF-e]] |
| 8 | `CNPJ_EMITENTE` | CNPJ da empresa emitente (12+2 dígitos) |
| 9 | `NOME_EMITENTE` | Razão social da empresa |
| 10 | `NUMERO_ITEM` | Sequência do item no documento |
| 11 | `CODIGO_ITEM` | SEQPRODUTO |
| 12 | `DESC_ITEM` | Descrição completa do produto |
| 13 | `COD_BARRA` | Código de barras ([[SAT]]) ou SEQPRODUTO ([[NF-e]]) |
| 14 | `NCM` | Código [[NCM]] da família |
| 15 | `CEST` | Código [[CEST]] |
| 16 | `CFOP` | [[CFOP]] da operação |
| 17 | `UNIDADE_MEDIDA` | Embalagem |
| 18 | `QTDE` | Quantidade |
| 19 | `VLR_UNITARIO` | Valor unitário líquido |
| 20 | `VLR_BRUTO_PROD` | Valor bruto do item |
| 21 | `VLR_DESCONTO` | Desconto do item |
| 22 | `VLR_OUT_DESP` | Outras despesas (soma de múltiplos campos) |
| 23 | `VLR_LIQ_ITEM` | Valor líquido do item |
| 24–25 | `RATEIO_DESCONTO` / `RATEIO_ACRESCIMO` | Rateio de desconto e acréscimo |
| 26 | `ORIGEM_ICMS` | 1º dígito de `SITUACAONF` ([[ICMS]] origem) |
| 27 | `CST_ICMS` | 2º e 3º dígitos de `SITUACAONF` ([[CST]]) |
| 28–30 | Base · Alíq · Valor [[ICMS]] | `VLR_BASE_CALC_ICMS`, `ALIQUOTA_ICMS`, `VLR_ICMS` |
| 31–34 | [[CST]] · Base · Alíq · Valor [[PIS]] | `CST_PIS`, `VLR_BASE_CALC_PIS`, `ALIQ_PIS`, `VLR_PIS` |
| 35–38 | [[CST]] · Base · Alíq · Valor [[COFINS]] | `CST_COFINS`, `VLR_BASE_CALC_COFINS`, `ALIQ_COFINS`, `VLR_COFINS` |
| 39–46 | Totais | [[ICMS]] · Produtos · Desconto · [[PIS]] · [[COFINS]] · Out. Desp · Desc. Subtotal · Acréscimo Subtotal |
| 47 | `INFO_COMPLEMENTAR` | Observações do documento (CHR(10/13) e `;` removidos) |
| 48+ | `VLRICMSST`, `VLRICMSSTRETIDO`, `VLRICMSSUBS` | **Somente Entradas** — [[ICMS-ST]] Substituição Tributária |

---

## Chamada Atual

Executa saídas e entradas para todas as [[Loja|lojas]] ativas (`MAX_EMPRESA`, exceto 300 e 999):

```sql
DECLARE 
  psNroEmpresa NUMBER(3);
BEGIN
  FOR t IN (SELECT NROEMPRESA EMP FROM MAX_EMPRESA X WHERE NROEMPRESA NOT IN (300,999))
  LOOP
    NAGP_BLB_EXT_SAIDAS  (DATE '2026-05-01', DATE '2026-05-31', t.EMP);
    NAGP_BLB_EXT_ENTRADAS(DATE '2026-05-01', DATE '2026-05-31', t.EMP);
    
  psNroEmpresa := t.Emp;
  
  END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      DBMS_OUTPUT.PUT_LINE(SQLERRM||' - '||psNroEmpresa);
END;
```

ps.: **Adicionado psNroEmpresa no Output para detalhes da empresa que gerou erro**

> Cupons [[SAT]] são extraídos separadamente via `NAGP_BLB_EXT_CUPONS_SAT` (sem loop por empresa).

---
## Pós-Processamento — Organização por Pasta

Script em [[Python]]
[Repositório: GMS-Corp/Python → Cria pasta e move arq.py](https://github.com/GMS-Corp/Python/blob/main/Cria%20pasta%20e%20move%20arq.py)

As procedures Oracle depositam saídas e entradas no **mesmo diretório** (`EXT_SAT_LOJA_{NNN}`). O consumidor dos arquivos requer que cada tipo esteja em pastas separadas. O script [[Python]] faz essa reorganização automaticamente:

### Lógica

```
\\[diretorio]\sat_store_{N}\        ← pasta de origem (uma por loja)
        ├── Ext_BLB_SAIDAS_...csv   → move para saidas_store_{N}\
        └── Ext_BLB_ENTRADAS_...csv → move para ent_store_{N}\
```

1. Descobre todas as pastas `sat_store_*` no diretório base
2. Para cada loja N, cria (se não existir) `ent_store_{N}` e `saidas_store_{N}`
3. Move arquivos da pasta de origem:
   - Nome contém `SAIDA` → `saidas_store_{N}`
   - Demais → `ent_store_{N}`
4. Passo de correção: varre `ent_store_{N}` e move para `saidas_store_{N}` qualquer arquivo com `SAIDA` no nome que tenha sido depositado errado em execuções anteriores

### Execução

```python
base_path = r"\\[diretorio]"   # caminho da rede com as pastas sat_store_*
# rodar: python "Cria pasta e move arq.py"
```

Não tem parâmetros — basta ajustar `base_path` e executar. Pode ser agendado após a extração Oracle ou rodado manualmente.