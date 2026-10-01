---
Language:
  - "[[SQL]]"
Repository:
  - "[[Import-XML-Duimp]]"
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
> [GiulianoGMS/Import-XML-Duimp](https://github.com/GiulianoGMS/Import-XML-Duimp)

---

## Contexto

Processo de importação do XML da **[[DUIMP]]** (Declaração Única de Importação), enviado pelo despachante, para tabelas Oracle customizadas. O objetivo é estruturar os dados da declaração para futuro confronto com os valores digitados pelo comprador no [[ERP]].

O arquivo XML é gerado pelo **PUCOMEX** (Portal Único do Siscomex) e depositado no diretório Oracle `TI` no servidor de banco. A leitura é feita via `BFILENAME` + `DBMS_LOB.LOADCLOBFROMFILE`, e o parse via `XMLTABLE`.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
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

## Script de Importação

Bloco PL/SQL anônimo que lê o XML do diretório Oracle `TI`, faz o parse e inserta nas duas tabelas. Suporta re-importação: apaga registros existentes da mesma `NUMERODUIMP` antes de inserir.

**Datas** do XML estão no formato `DD/MM/YYYY HH24:MI:SS` — convertidas com `TO_DATE`. `DATADESEMBARACO` pode vir vazia; tratada com `NULLIF`.

```sql
DECLARE
  v_bfile       BFILE;
  v_clob        CLOB;
  v_dest_offset INTEGER := 1;
  v_src_offset  INTEGER := 1;
  v_lang        INTEGER := 0;
  v_warning     INTEGER;
  v_arquivo     VARCHAR2(200) := 'Duimp_26BR00016589107.xml';
  v_numero      VARCHAR2(20);
BEGIN
  v_bfile := BFILENAME('TI', v_arquivo);

  DBMS_LOB.CREATETEMPORARY(v_clob, TRUE);
  DBMS_LOB.FILEOPEN(v_bfile, DBMS_LOB.FILE_READONLY);
  DBMS_LOB.LOADCLOBFROMFILE(
    dest_lob     => v_clob,       src_bfile    => v_bfile,
    amount       => DBMS_LOB.LOBMAXSIZE,
    dest_offset  => v_dest_offset, src_offset   => v_src_offset,
    bfile_csid   => NLS_CHARSET_ID('UTF8'),
    lang_context => v_lang,        warning      => v_warning
  );
  DBMS_LOB.FILECLOSE(v_bfile);

  SELECT EXTRACTVALUE(XMLTYPE(v_clob), '/DUIMP/NUMERODUIMP')
    INTO v_numero FROM DUAL;

  DELETE FROM NAGT_DUIMP_ITENS WHERE NUMERODUIMP = v_numero;
  DELETE FROM NAGT_DUIMP_CAPA  WHERE NUMERODUIMP = v_numero;

  INSERT INTO NAGT_DUIMP_CAPA ( ... )
  SELECT ... FROM XMLTABLE('/DUIMP' PASSING XMLTYPE(v_clob) COLUMNS ...) X;

  INSERT INTO NAGT_DUIMP_ITENS ( ... )
  SELECT v_numero, X.* FROM XMLTABLE('/DUIMP/PRODUTOS/ITEM' PASSING XMLTYPE(v_clob) COLUMNS ...) X;

  COMMIT;
  DBMS_LOB.FREETEMPORARY(v_clob);
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_LOB.FREETEMPORARY(v_clob);
    RAISE;
END;
```

> Script completo (com todos os campos mapeados) em [`Insert DUIMP.sql`](https://github.com/GiulianoGMS/Import-XML-Duimp/blob/main/Insert%20DUIMP.sql)

---

## Diretório Oracle

O arquivo XML deve estar no servidor de banco no diretório mapeado como `TI`:

```sql
-- Verificar diretório existente
SELECT * FROM ALL_DIRECTORIES WHERE DIRECTORY_NAME = 'TI';
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

- [ ] Confronto dos dados importados vs valores digitados pelo comprador no ERP
- [ ] Identificar tabelas do ERP onde o comprador registra os dados da DUIMP
- [ ] View ou procedure de validação com divergências por campo

