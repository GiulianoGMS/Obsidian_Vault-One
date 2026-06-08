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
  - "[[CPF]]"
Date:
Type: "[[Package]]"
Project: "[[Backlgrs - Salesforce]]"
tags:
  - Projects
---
### Visão Geral

Integração entre o [[ERP]] Consinco e a plataforma de [[CRM]] **Backlgrs/Salesforce**. Exporta múltiplos tipos de dados para arquivos CSV via UTL_FILE, gravados no diretório de banco `BACKLGRS`.

Ao contrário da [[Instaleap|integração Instaleap]] (somente [[Catálogo]]), o [[Backlgrs]] recebe também **dados de clientes, filiais e histórico de [[Vendas]]**, alimentando o [[CRM]] com visão completa do comportamento de compra.

---

### Arquivos Exportados

| Procedure | Arquivo gerado | Agrupamento |
|-----------|---------------|-------------|
| `NAGP_BKLGRS_EXT_CATALOGO` | `Ext_Bklgrs_Catalogo_{tipo}.csv` | F=Full · I=Incremental · A=Atualização |
| `NAGP_BKLGRS_EXT_PRODUTO` | `Ext_Bklgrs_Produto_{tipo}.csv` | F=Full · I=Incremental |
| `NAGP_BKLGRS_EXT_PESSOA` | `Ext_Bklgrs_Pessoa_Full.csv` | Sempre full |
| `NAGP_BKLGRS_EXT_FILIAL` | `Ext_Bklgrs_Filial_{tipo}.csv` | F=Full · parcial só se há nova [[Loja]] |
| `NAGP_BKLGRS_EXT_OFERTAS` | `Ext_Bklgrs_Ofertas_{DD_MM}.csv` | Data do dia |
| `NAGP_BKLGRS_EXT_VENDAS` | `Ext_Bklgrs_Vendas_{agrup}.csv` | Ver modos abaixo |

**Modos de agrupamento de [[Vendas]] (`psTipoAgrup`):**

| Código | Arquivo | Descrição |
|--------|---------|-----------|
| `'F'` | `_Full` | Todo o período informado em um único arquivo |
| `'D'` / `'I'` | `_DD_MM_YYYY` | Um arquivo por dia do período |
| `'S'` | `_S{semana}_{mes}_{ano}` | Um arquivo por semana |
| `'M'` | `_{mes}_{ano}` | Um arquivo por mês |
| `'A'` | `_{ano}` | Um arquivo por ano |

---

### Catálogo — Estoque e Preço por Loja

View: `NAGV_BKLGRS_CATALOGO`

| Campo | Descrição |
|-------|-----------|
| `COD_CATUNICO` | Chave única: `LPAD(SEQPRODUTO,10,0) \|\| LPAD(NROEMPRESA,3,0)` |
| `IDPRODUTO` / `IDFILIAL` | [[SKU]] e [[Loja]] |
| `PRECO` | `PRECOVALIDNORMAL` |
| `ESTOQUE` | `FC5ESTOQUEDISPONIVEL(SEQPRODUTO, NROEMPRESA)` |
| `ISACTIVE` | `STATUSVENDA = 'A'` e `INDINTEGRAECOMMERCE = 'S'` |
| `DT_ULTIMA_ALTERACAO` | Maior entre última movimentação de [[Estoque]] e última alteração de preço |
| `PERPETUO` | `1` para categorias com [[Estoque]] mascarado (ver tabela abaixo) |

**Regra do campo `PERPETUO`:**

| Categoria | Condição | `PERPETUO` |
|-----------|----------|------------|
| HORTIFRUTI | Sem [[EAN]] cadastrado | `1` |
| AÇOUGUE · PADARIA · FRIOS E LATICINIOS | Presente em `NAGT_DEPARA_STOCK_IEAP` | `1` |
| Demais | — | `0` |

> `PERPETUO = 1` sinaliza ao [[CRM]] que o [[Estoque]] não deve ser considerado para controle de disponibilidade.

---

### Produto — Cadastro Master

Views: `NAGV_BKLGRS_PRODUTO` / `V2` / `V3`

| Campo | Origem |
|-------|--------|
| `IDPRODUTO` | [[SKU]] (`SEQPRODUTO`) |
| `DESCRICAOCOMPLETA` | `DESCCOMPLETA` |
| `DESCRICAORESUMIDA` | `DESCREDUZIDA` |
| `UNIDADE` | `'KG'` (pesável) · `'UN'` (demais) |
| `CATEGORIA` / `GRUPO` / `SUBGRUPO` | Hierarquia de 3 níveis via `DIM_CATEGORIA@CONSINCODW` |
| `MARCA` / `MARCAPROPRIA` | Marca e flag `'TRUE'` se `MARCA = 'NAGUMO'` |
| `PRODUTOSAZONAL` | `'TRUE'` se `CATEGORIAN1 = 'SAZONALIDADE'` |
| `EAN` | [[EAN]] via `MAP_PRODCODIGO` (`TIPCODIGO = 'E'`, `INDUTILVENDA = 'S'`) |
| `IDFORNECEDOR` / `NOMEFORNECEDOR` | [[Fornecedor]] principal da família |
| `IDMATERIALPAI` / `DESCRICAOMATERIALPAI` | Produto base vinculado (`SEQPRODUTOBASE`) |
| `URL` | `https://assetsmn.s3.us-east-1.amazonaws.com/assets/ofertas/{SKU}.jpg` |
| `DESC_HUMANIZADA` | `NOMEPRODUTOECOMM` (com limpeza de quebras de linha) |
| `IND_INTEGRA_ECOMM` | `INDINTEGRAECOMMERCE = 'S'` → `'TRUE'` |
| `DTA_ALT` | Maior entre: inclusão, alteração do produto, alteração da família, alteração do [[EAN]] |

---

### Pessoa — Clientes

View: `NAGV_BKLGRS_PESSOA`

| Campo | Descrição |
|-------|-----------|
| `ID_NAGUMO` | `SEQPESSOA` |
| `CPF` | [[CPF]] do cliente (`LPAD(NROCGCCPF,9,0) \|\| LPAD(DIGCGCCPF,2,0)`) |
| `NAME` | Nome completo |
| `DATA_CADASTRO` / `DATA_NASCIMENTO` | Formato `YYYY-MM-DD` |
| `SEXO` | Sexo cadastrado |
| `ENDERECO`, `NUMERO`, `CIDADE`, `ESTADO`, `CEP` | Endereço com limpeza de tabs (`CHR(9)`) |
| `PHONE` / `TELEFONE` | `'+55'` + DDD + número (ajusta comprimento) |
| `EMAIL` | Email com limpeza de tabs |
| `PUSH_DEVICE_IDS` | Device ID para [[Push Notification]], via `app_customer@BI` |
| `DATA_ALTERACAO` | Última alteração do cadastro |

Filtros: somente pessoas físicas (`FISICAJURIDICA = 'F'`) com [[CPF]] preenchido.

---

### Filial — Lojas

View: `NAGV_BKLGRS_FILIAL`

| Campo | Descrição |
|-------|-----------|
| `IDFILIAL` / `NOMEFANTASIA` | ID e nome da [[Loja]] |
| `TIPOLOGRADOURO` | Derivado do texto: AV → AVENIDA, ESTRADA, PRACA, RODOVIA, VIA, RUA |
| Endereço completo | Logradouro, número, complemento, bairro, cidade, CEP, UF |
| `NUMLAT` / `NUMLONG` | Coordenadas geográficas |
| `TIPOFILIAL` / `IDREGIONAL` / `REGIONAL` | Tipo e regional |
| `NUMMETRAGEM` / `NUMAREAVENDA` / `QTDFUNCIONARIOS` | Métricas operacionais |
| `FRANQUIA` | Fixo `'PROPRIA'` |

---

### Ofertas — Promoções Ativas

#### `NAGV_BKLGRS_PROMOCOES_ATIVAS`

Exporta [[Promoção|promoções]] vigentes de `MRL_PROMOCAO` + `MRL_PROMOCAOITEM` com:
- `CENTRALLOJA = 'M'` (gerenciadas na central)
- `QTDEMBALAGEM = 1`
- Data atual dentro do período de vigência

#### `NAGV_BKLGRS_PROMOCOES_ATIVAS_CRM`

[[Promoção|Promoções]] personalizadas do [[CRM]] — originadas de encartes com `DESCRICAO LIKE 'CRM PERSONALIZADA%'` ou `SEQGRUPOPROMOC = 11`, vigentes no dia. Retorna `'DescontoDePor Personalizada'` como descrição e datas no formato ISO (`YYYY-MM-DD"T"HH24:MI:SS"Z"`).

#### `NAGV_BKLGRS_MENORPROMOCATIVA_V2`

Retorna o **menor preço [[Promoção|promocional]] ativo** por [[SKU]]/[[Loja]], composto por dois blocos via `UNION ALL`:

**Bloco 1 — Promoções regulares + ST:**
- Usa `ROW_NUMBER() OVER (PARTITION BY SKU, STOREREFERENCE ORDER BY PRICE ASC)` para pegar o menor preço de `NAGV_BKLGRS_PROMOCOES_ATIVAS`
- Se existe promoção ST ativa (`NAGV_BKLGRS_PROMOCOES_ATIVAS_ST`) e a regular está inativa, substitui pelo preço ST
- Filtros: só lojas em `NAGV_EMP_ECOMMERCE`; preço diferente do normal; desconto ≤ 70% (exceto Hortifruti, que não tem limite)

**Bloco 2 — Promoções CRM:**
- `UNION ALL` com `NAGV_BKLGRS_PROMOCOES_ATIVAS_CRM` — adicionadas integralmente, sem filtro de desconto máximo
- Campo `PERC` fixo em `0` (percentual não calculado para CRM personalizado)

---

### Vendas

View: `NAGV_BKLGRS_VENDAS` + `NAGV_BKLGRS_VENDAS_AGRUP`

| Campo                               | Descrição                           |
| ----------------------------------- | ----------------------------------- |
| `IDPESSOA`                          | [[CPF]] do cliente                  |
| `IDFILIAL` / `IDCUPOM` / `NROCUPOM` | [[Loja]] e cupom fiscal             |
| `IDPRODUTO`                         | [[SKU]]                             |
| `DATA_COMPLETA`                     | Data + hora da operação             |
| `NUMQTDVENDIDA`                     | Quantidade vendida                  |
| `VLRPRECOVENDAUNITARIO`             | Preço de venda unitário             |
| `VLRDESCONTOUNITARIO`               | Desconto unitário                   |
| `VLRMARGEMPDV`                      | Margem calculada como % da operação |
| `TXTCANALVENDAS`                    | Canal de venda ou `PEDIDOID`        |
| `TXTTIPOVENDA` / `TXTFORMAPAGTO`    | Tipo de venda e forma de pagamento  |

`NAGV_BKLGRS_VENDAS_AGRUP` agrupa as [[Vendas]] por cupom/produto para envio consolidado ao [[CRM]].

---

### Todos os Objetos

| Objeto                                          | Tipo      | Descrição                                                        |
| ----------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `NAGV_BKLGRS_CATALOGO` / `_FULL`                | View      | [[Catálogo]] por [[Loja]] ([[Estoque]], preço, status, perpetuo) |
| `NAGV_BKLGRS_PRODUTO` / `V2` / `V3`             | View      | Cadastro master de produtos (evoluções)                          |
| `NAGV_BKLGRS_PESSOA`                            | View      | Clientes com [[CPF]], endereço, telefone e push token            |
| `NAGV_BKLGRS_FILIAL`                            | View      | Dados cadastrais e métricas das [[Loja]]                         |
| `NAGV_BKLGRS_VENDAS`                            | View      | Histórico de [[Vendas]] por item/cupom                           |
| `NAGV_BKLGRS_VENDAS_AGRUP`                      | View      | [[Vendas]] agrupadas por cupom/produto                           |
| `NAGV_BKLGRS_PROMOCOES_ATIVAS` / `_CRM` / `_ST` | View      | [[Promoção]] vigente (variantes por contexto)                    |
| `NAGV_BKLGRS_MENORPROMOCATIVA` / `V2`           | View      | Menor [[Promoção]] ativa por [[SKU]]/[[Loja]]                    |
| `NAGF_BUSCAEAN_BKLGRS_V2`                       | Function  | Busca [[EAN]] do produto para o [[CRM]]                          |
| `NAGP_BKLGRS_EXT_CATALOGO` / `_FULL`            | Procedure | Exporta [[Catálogo]] para CSV                                    |
| `NAGP_BKLGRS_EXT_PRODUTO`                       | Procedure | Exporta produtos para CSV                                        |
| `NAGP_BKLGRS_EXT_PESSOA` / `_v2`                | Procedure | Exporta clientes para CSV                                        |
| `NAGP_BKLGRS_EXT_FILIAL`                        | Procedure | Exporta filiais para CSV                                         |
| `NAGP_BKLGRS_EXT_OFERTAS`                       | Procedure | Exporta [[Oferta]] ativas para CSV                               |
| `NAGP_BKLGRS_EXT_VENDAS`                        | Procedure | Exporta [[Vendas]] para CSV (múltiplos agrupamentos)             |

---

### Links

- [Repositório — GiulianoGMS/Backlgrs-CRM](https://github.com/GiulianoGMS/Backlgrs-CRM)