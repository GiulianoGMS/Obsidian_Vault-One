---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Financeiro]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[ISSQN]]"
  - "[[Financeiro]]"
  - "[[Títulos]]"
Date: 2026-06-18
Type: Ferramenta
---

> [!info] Referência
> Repositório: [GiulianoGMS/DDL-Objects-Oracle — NAGP_INSERETITISS.prc](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_INSERETITISS.prc)

---

## Visão Geral

Ferramenta de uso pontual para **inserir manualmente** os títulos financeiros de ISSQN e SERV a Recolher (`SERVRC`) quando esses não foram gerados automaticamente pelo [[PLSQL-ERP-Consinco]] durante o recebimento de [[NF-e de serviço]].

A procedure copia a estrutura de um título-base já existente, substituindo apenas os campos de número, valor e datas, e evita duplicidade via `NOT EXISTS`.

---

## Quando usar

- O ERP processou a [[NFe]] mas **não gerou** os [[títulos]] de [[espécie]] `ISSQN` e/ou `SERVRC`
- O [[financeiro]] precisa que esses títulos existam em `MRL_TITULOFIN` para integração e baixa

---

## Parâmetros

| Parâmetro        | Tipo     | Descrição                                                                            |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `nroTituloBase`  | `NUMBER` | Número do título já existente usado como modelo (deve ter espécies `ISSQN`/`SERVRC`) |
| `nroEmpresaBase` | `NUMBER` | Empresa do título base (filtra a busca no FROM)                                      |
| `nroTituloServ`  | `NUMBER` | Número do novo título SERV (gravado em `NUMERONFSE`)                                 |
| `nroTituloIss`   | `NUMBER` | Número do novo título ISS (gravado em `NROTITULO` e `NRODOCUMENTO`)                  |
| `vlrSERV`        | `NUMBER` | Valor do título SERVRC (`VLRORIGINAL`)                                               |
| `vlrISS`         | `NUMBER` | Valor do título ISSQN (`VLRORIGINAL`)                                                |
| `vEmissao`       | `DATE`   | Data de emissão dos novos títulos                                                    |
| `vVencimento`    | `DATE`   | Data de vencimento dos novos títulos                                                 |
+ Adicionado vSeqPessoa e vSessoaISSQN para insercao
---

## Exemplo de Uso

```sql
BEGIN
  NAGP_INSERETITISS(nroTituloBase   => 52,
                    nroEmpresaBase  => 26,
                    nroTituloServ   => 10199,
                    vlrSERV         => 10,
                    nroTituloIss    => 51,
                    vlrISS          => 0.50,
                    vEmissao        => TRUNC(SYSDATE) + 7,
                    vVencimento     => TRUNC(SYSDATE),
                    vSeqPessoa      => 942508,
                    vSeqPessoaIssQN => 1455);
                    
                    END;
```

Após executar, rodar obrigatoriamente:

```sql
EXECUTE CONSINCO.CAFD_INTEG_TIT_FINANCEIRO;
```

---

## O que a [[procedure]] faz

1. Busca em `CONSINCO.MRL_TITULOFIN` os títulos do `nroTituloBase` com espécie `ISSQN` ou `SERVRC`
2. Para cada linha encontrada, insere um novo registro copiando todos os campos, com estas substituições:

| Campo substituído | Valor |
|-------------------|-------|
| `SEQTITULO` | `MAX(SEQTITULO) + ROWNUM` — próxima sequência disponível |
| `NROTITULO` / `NRODOCUMENTO` | `nroTituloIss` |
| `NUMERONFSE` | `nroTituloServ` |
| `VLRORIGINAL` | `vlrISS` se espécie `ISSQN`; `vlrSERV` se espécie `SERVRC` |
| `DTAEMISSAO` | `vEmissao` |
| `DTAVENCIMENTO` | `vVencimento` |
| `INDEXPORTACAO` | `'I'` (marcado como integrado) |
| `SEQINTEGRACAO` | `NULL` |

3. **Proteção contra duplicidade:** o `NOT EXISTS` verifica se já existe um título com o mesmo `NROTITULO + CODESPECIE + NROEMPRESA` antes de inserir

---

## Fluxo pós-execução

```
NAGP_INSERETITISS(...)
        │
        ▼
INSERT em CONSINCO.MRL_TITULOFIN
(espécies ISSQN e SERVRC com novos números e valores)
        │
        ▼
CONSINCO.CAFD_INTEG_TIT_FINANCEIRO
(integra os títulos inseridos no financeiro)
```

---

## Objetos de Banco Utilizados

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `CONSINCO.MRL_TITULOFIN` | Tabela | Títulos financeiros — fonte e destino do INSERT |
| `CONSINCO.CAFD_INTEG_TIT_FINANCEIRO` | Procedure | Integração financeira dos títulos inseridos (executar após) |

---

## Observações

> [!warning] Executar CAFD após o INSERT
> Sem rodar `CONSINCO.CAFD_INTEG_TIT_FINANCEIRO` o título existe na tabela mas não está integrado no financeiro — não aparece nos relatórios nem permite baixa.

> [!tip] Como identificar o título base
> Buscar em `MRL_TITULOFIN` pelo número da NF-e ou fornecedor, filtrando `CODESPECIE IN ('ISSQN','SERVRC')` para confirmar que os títulos não existem antes de rodar a procedure.

> [!note] SEQTITULO gerado via MAX + ROWNUM
> A abordagem `MAX(SEQTITULO) + ROWNUM` garante sequência única no momento da execução, mas pode colidir em ambientes com alto volume concorrente. Em produção, confirmar que nenhuma outra inserção ocorre simultaneamente.
