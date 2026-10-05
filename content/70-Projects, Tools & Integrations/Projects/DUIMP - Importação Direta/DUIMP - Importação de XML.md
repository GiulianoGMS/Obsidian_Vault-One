---
Language:
  - "[[SQL]]"
Repository:
  - "[[DUIMP-Importacao-XML-x-ERP]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
  - "[[Compras]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[DUIMP]]"
  - "[[Importação]]"
  - "[[XML]]"
  - "[[Despachante]]"
Date: 2026-10-01
Type:
tags:
  - Projects
---

> [!info] Referência
> [GiulianoGMS/DUIMP-Importacao-XML-x-ERP](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP) *(repositório `Import-XML-Duimp` renomeado)*

> [!note] Continua em
> O vínculo da DUIMP importada com o Pedido de Importação do ERP (câmbio, itens, despesas) é feito pela procedure `NAGP_IMP_DADOS_DUIMP`, documentada em [[DUIMP - Vinculação com Pedido de Importação]]. O relatório de confronto DUIMP x ERP (Centura Report Builder) está em [[DUIMP - Relatório Comparativo XML x ERP]].
>
> Visão geral do processo completo (fluxo e objetos em ordem): [[DUIMP - Visão Geral do Processo]].

---

## Contexto

Processo de importação do XML da **[[DUIMP]]** (Declaração Única de Importação), enviado pelo despachante, para tabelas Oracle customizadas. O objetivo é estruturar os dados da declaração para futuro confronto com os valores digitados pelo comprador no [[ERP]].

O arquivo XML é gerado pelo **PUCOMEX** (Portal Único do Siscomex) e depositado no diretório Oracle `DUIMP_IMPORTAR` no servidor de banco. A leitura é feita via `BFILENAME` + `DBMS_LOB.LOADCLOBFROMFILE`, e o parse via `XMLTABLE`. Após importação bem-sucedida, o arquivo é movido automaticamente para `DUIMP_PROCESSADOS`.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `NAGP_IMP_DUIMP` | Procedure | Lê XML do diretório, faz parse e insere nas tabelas — move arquivo ao fim |
| `NAGT_DUIMP_CAPA` | Tabela | Dados do cabeçalho da DUIMP — 1 linha por declaração |
| `NAGT_DUIMP_ITENS` | Tabela | Itens/adições da DUIMP — N linhas por declaração |

---

## Tabela — `NAGT_DUIMP_CAPA`

Dados gerais da declaração. PK: `NUMERODUIMP`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `NUMERODUIMP` | `VARCHAR2(20)` PK | Número da DUIMP (ex: `26BR00016589107`) |
| `VERSAODUIMP` | `NUMBER` | Versão do documento |
| `DATAXML` | `DATE` | Data/hora de geração do XML |
| `DATADUIMP` | `DATE` | Data de registro da DUIMP |
| `DATADOLAR` | `DATE` | Data de câmbio do dólar |
| `DATADESEMBARACO` | `DATE` | Data de desembaraço (pode ser nula) |
| `UFDESEMBARACO` | `VARCHAR2(2)` | UF do desembaraço (ex: `SP`) |
| `LOCALDESEMBARACO` | `VARCHAR2(100)` | Local do desembaraço (ex: `SANTOS`) |
| `COTACAODOLAR` | `NUMBER` | Cotação do dólar na data |
| `TAXASISCOMEX` | `NUMBER` | Taxa Siscomex |
| `DESPESASADUANEIRAS` | `NUMBER` | Despesas aduaneiras |
| `FRETE` | `NUMBER` | Valor do frete |
| `SEGURO` | `NUMBER` | Valor do seguro |
| `IPI` | `NUMBER` | Valor total de IPI |
| `PIS` | `NUMBER` | Valor total de PIS |
| `COFINS` | `NUMBER` | Valor total de COFINS |
| `II` | `NUMBER` | Valor total de II (Imposto de Importação) |
| `ICMS` | `NUMBER` | Valor total de ICMS |
| `TOTALMATERIAISDOLAR` | `NUMBER` | Total de materiais em dólar |
| `MOEDAMLE` | `VARCHAR2(5)` | Código da moeda MLE (ex: `978` = EUR) |
| `VMLE` | `NUMBER` | Valor em moeda estrangeira |
| `VMLD` | `NUMBER` | Valor em dólar |
| `INFOCOMPLEMENTARES` | `VARCHAR2(500)` | Informações complementares (pode ser nulo) |
| `CNPJIMP` | `VARCHAR2(14)` | CNPJ do importador |
| `TIPOEMB` | `VARCHAR2(50)` | Tipo de embalagem (ex: `CAIXA DE PAPELAO`) |
| `VLQTDEEMB` | `NUMBER` | Quantidade de embalagens |
| `XML_ORIGINAL` | `CLOB` | XML bruto completo — preserva campos não mapeados e versões futuras |
| `DTAIMPORTACAO` | `DATE` | Data de importação para a tabela (`SYSDATE`) |
| `NMARQUIVO` | `VARCHAR2(200)` | Nome do arquivo XML lido |

---

## Tabela — `NAGT_DUIMP_ITENS`

Itens da declaração. PK composta: `(NUMERODUIMP, IT)`. FK para `NAGT_DUIMP_CAPA`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `NUMERODUIMP` | `VARCHAR2(20)` FK | Número da DUIMP |
| `IT` | `NUMBER` | Número do item (atributo `@IT` da tag `<ITEM>`) |
| `NUMEROADICAO` | `VARCHAR2(3)` | Número da adição |
| `NUMEROITEM` | `VARCHAR2(4)` | Número do item dentro da adição |
| `CODIGO` | `NUMBER` | Código do produto informado pelo despachante |
| `DESCRICAO` | `VARCHAR2(500)` | Descrição do produto |
| `DESCRICAOCOMPLEMENTAR` | `VARCHAR2(2000)` | Descrição complementar (lote, fabricação, validade) |
| `NCM` | `VARCHAR2(10)` | NCM do produto |
| `UNIDADE` | `VARCHAR2(5)` | Unidade de medida (ex: `KG`) |
| `QUANTIDADE` | `NUMBER` | Quantidade declarada |
| `VALORUNITARIODOLAR` | `NUMBER` | Valor unitário em dólar |
| `PESO_LIQUIDO` | `NUMBER` | Peso líquido (kg) |
| `PESO_BRUTO` | `NUMBER` | Peso bruto (kg) |
| `ALIQUOTAPIS` | `NUMBER` | Alíquota PIS (%) |
| `ALIQUOTAPISREDUZIDA` | `NUMBER` | Alíquota PIS reduzida (%) |
| `BASECALCULOII` | `NUMBER` | Base de cálculo do II |
| `BASECALCULOIPI` | `NUMBER` | Base de cálculo do IPI |
| `BASECALCULOPISCOFINS` | `NUMBER` | Base de cálculo de PIS/COFINS |
| `BASECALCULOICMS` | `NUMBER` | Base de cálculo do ICMS |
| `VALORPIS` | `NUMBER` | Valor de PIS |
| `ALIQUOTACOFINS` | `NUMBER` | Alíquota COFINS (%) |
| `ALIQUOTACOFINSREDUZIDA` | `NUMBER` | Alíquota COFINS reduzida (%) |
| `VALORCOFINS` | `NUMBER` | Valor de COFINS |
| `ALIQUOTAIPI` | `NUMBER` | Alíquota IPI (%) |
| `VALORIPI` | `NUMBER` | Valor de IPI |
| `ALIQUOTAII` | `NUMBER` | Alíquota II (%) |
| `VALORII` | `NUMBER` | Valor de II |
| `EXPORTADOR` | `VARCHAR2(100)` | Nome do exportador |
| `PAISORIGEM` | `VARCHAR2(50)` | País de origem |
| `FABRICANTE` | `VARCHAR2(100)` | Nome do fabricante |
| `CST` | `VARCHAR2(3)` | CST do item |
| `CCLASSIF` | `VARCHAR2(10)` | Classificação fiscal complementar |
| `VALORALIQIBS` | `NUMBER` | Valor alíquota IBS (Reforma Tributária) |
| `VALORALIQICBS` | `NUMBER` | Valor alíquota ICBS |
| `VALORIBSUF` | `NUMBER` | Valor IBS estadual |
| `VALORIBSMUN` | `NUMBER` | Valor IBS municipal |
| `VALORCBS` | `NUMBER` | Valor CBS |

---

## Procedure — `NAGP_IMP_DUIMP`

Recebe o número da DUIMP, monta o nome do arquivo (`Duimp_<NroDI>.xml`), lê do diretório `DUIMP_IMPORTAR`, faz parse via `XMLTABLE` e insere nas duas tabelas. Suporta re-importação: apaga registros existentes antes de inserir.

**Parâmetro:** `psNroDI VARCHAR2` — número da DUIMP (ex: `26BR00016589107`)

**Fluxo:**

```
1. UTL_FILE.FGETATTR  → valida existência do arquivo antes de abrir
2. DBMS_LOB.LOADCLOBFROMFILE (UTF8) → lê XML como CLOB
3. EXTRACTVALUE → extrai NUMERODUIMP do XML para usar como PK/FK
4. DELETE NAGT_DUIMP_ITENS + NAGT_DUIMP_CAPA (re-importação idempotente)
5. INSERT NAGT_DUIMP_CAPA via XMLTABLE('/DUIMP')
6. INSERT NAGT_DUIMP_ITENS via XMLTABLE('/DUIMP/PRODUTOS/ITEM')
7. COMMIT + DBMS_LOB.FREETEMPORARY
8. UTL_FILE.FCOPY → copia para DUIMP_PROCESSADOS
   UTL_FILE.FREMOVE → remove de DUIMP_IMPORTAR
   (em sub-bloco isolado — falha aqui não faz rollback dos dados já commitados)
```

> [!warning] Arquivo não encontrado
> Se `Duimp_<NroDI>.xml` não existir em `DUIMP_IMPORTAR`, a procedure lança `ORA-20001` via `RAISE_APPLICATION_ERROR` antes de tentar abrir o BFILE.

**Datas** do XML estão no formato `DD/MM/YYYY HH24:MI:SS`. `DATADESEMBARACO` pode vir vazia — tratada com `NULLIF(..., '')`.

**Chamada:**
```sql
BEGIN
  NAGP_IMP_DUIMP('26BR00016589107');
END;
```

> Código-fonte completo em [`NAGP_IMP_DUIMP.prc`](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP/blob/main/NAGP_IMP_DUIMP.prc)

---

## Diretórios Oracle

| Diretório Oracle | Finalidade |
|---|---|
| `DUIMP_IMPORTAR` | Arquivos aguardando importação — a procedure lê daqui |
| `DUIMP_PROCESSADOS` | Arquivos já importados — movidos automaticamente após COMMIT |

```sql
-- Verificar diretórios
SELECT DIRECTORY_NAME, DIRECTORY_PATH
  FROM ALL_DIRECTORIES
 WHERE DIRECTORY_NAME IN ('DUIMP_IMPORTAR', 'DUIMP_PROCESSADOS');

-- Criar (ajustar o caminho conforme ambiente)
CREATE OR REPLACE DIRECTORY DUIMP_IMPORTAR    AS '/dados/duimp/importar';
CREATE OR REPLACE DIRECTORY DUIMP_PROCESSADOS AS '/dados/duimp/processados';
GRANT READ, WRITE ON DIRECTORY DUIMP_IMPORTAR    TO CONSINCO;
GRANT READ, WRITE ON DIRECTORY DUIMP_PROCESSADOS TO CONSINCO;
```

---

## Extensibilidade — Campos Futuros

O layout XML da DUIMP pode evoluir (novos campos, novos modais de transporte). A coluna `XML_ORIGINAL CLOB` preserva o XML bruto — qualquer campo não mapeado hoje pode ser extraído futuramente sem precisar do arquivo original:

```sql
-- Extrair campo novo de XMLs já importados
SELECT C.NUMERODUIMP,
       EXTRACTVALUE(C.XML_ORIGINAL, '/DUIMP/NOVATAG') AS NOVATAG
  FROM NAGT_DUIMP_CAPA C;

-- Extrair campo novo nos itens
SELECT C.NUMERODUIMP, X.NOVATAG
  FROM NAGT_DUIMP_CAPA C,
       XMLTABLE('/DUIMP/PRODUTOS/ITEM'
          PASSING C.XML_ORIGINAL
          COLUMNS NOVATAG VARCHAR2(200) PATH 'NOVATAG'
       ) X;
```

> Se a tag não existir no XML, o Oracle retorna `NULL` — sem erro.

---

## Próximos Passos

### Entrada de dados

- [ ] **Query / View de entrada** — consulta inicial que une `NAGT_DUIMP_CAPA` + `NAGT_DUIMP_ITENS` com as tabelas de recebimento do ERP (base para cruzamento por NCM, quantidade e valores). Ponto de partida antes de construir o relatório.

### Confronto ERP x Arquivo

- [x] **Vínculo com o Pedido de Importação** — `NAGP_IMP_DADOS_DUIMP` liga a DUIMP a um `MAD_PIPEDIDOIMPORT` existente e preenche câmbio, itens (`MAD_PIPEDIMPORTPROD`) e despesas (`MAD_PIPEDDESPESA`) automaticamente. Ver **[[DUIMP - Vinculação com Pedido de Importação]]**.
- [ ] **Relatório de divergências** — comparar campo a campo os valores do arquivo DUIMP importado vs os valores digitados pelo comprador no ERP (continua em aberto; o passo acima preenche, mas ainda não valida/compara contra digitação manual prévia)
- [ ] View ou procedure de validação com status por campo (`OK` / `DIVERGENTE` / `NAO_ENCONTRADO`)
- [ ] Tributos (IPI/PIS/COFINS/ICMS) como despesa do pedido — hoje comentado em `NAGP_IMP_DADOS_DUIMP`, decisão pendente
- [ ] Crítica de AFRMM ausente para importação marítima

