---
Language:
  - "[[SQL]]"
Repository:
  - "[[Custom-Features]]"
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Família]]"
  - "[[Produto]]"
  - "[[Cadastro]]"
  - "[[Validação]]"
Type: "[[Function]]"
tags:
  - Projects
---

[Repositório no GitHub →](https://github.com/GiulianoGMS/Custom-Features)

Customização oficial [[TOTVS]] que permite criar **regras de trava no cadastro de [[Família]] e [[Produto]]** diretamente no [[ERP]] Consinco. A [[TOTVS]] desenvolveu o mecanismo (functions + tabela de registro); as regras de negócio são definidas internamente, campo a campo.

Origem: GLPI #681051 — solicitação de trava para evitar erros operacionais no cadastro.

---

## Como Funciona

O [[ERP]] executa um hook de validação **antes de cada save** (`'B'` · `'U'`). Para cada campo monitorado, há um registro em `GE_VALIDAINSUPDDELCUSTOM` com um SQL que chama a function de validação. Se a function retornar texto não vazio, o [[ERP]] **exibe a mensagem e bloqueia o save**. Se retornar `NULL` ou `''`, permite normalmente.

```
Usuário salva Família/Produto no ERP
           ↓
GE_VALIDAINSUPDDELCUSTOM
  → executa: SELECT espf_validafamilia('dfnSeqFamilia', :valor) FROM DUAL
           ↓
  NULL / ''  → Permite
  Texto      → Bloqueia com a mensagem retornada
```

---

## Objetos

| Objeto | Tipo | Tela | Programa |
|--------|------|------|----------|
| `ESPF_VALIDAFAMILIA` | Function | Cadastro de Família | MAX0049 |
| `ESPF_VALIDAPRODUTO` | Function | Cadastro de Produto | MAX0091 |
| `GE_VALIDAINSUPDDELCUSTOM` | Tabela | — | Registro dos hooks por campo |

---

## Assinatura das Functions

Ambas têm a mesma assinatura:

```sql
FUNCTION ESPF_VALIDAFAMILIA (
  psComponente      VARCHAR2,   -- nome do campo/componente do form
  psValorComponente VARCHAR2    -- valor atual do campo
) RETURN VARCHAR2
```

- Retorno `NULL` ou `''` → **permite**
- Retorno com texto → **bloqueia** e exibe a mensagem ao usuário

---

## Registro em GE_VALIDAINSUPDDELCUSTOM

Cada campo monitorado tem uma linha na tabela. O script `MAX0049_MAX0091_U.sql` registra todos os campos das abas **Geral** e **Dados Fiscais** para ambos os cadastros:

```sql
INSERT INTO GE_VALIDAINSUPDDELCUSTOM VALUES (
  'MAX0049',       -- programa (MAX0049 = Família · MAX0091 = Produto)
  'frmFamilia',    -- nome do form
  1,               -- sequência
  'SELECT espf_validafamilia(''dfnSeqFamilia'', :frmFamilia.dfnSeqFamilia) from dual',
  'B',             -- Before (antes do save)
  'U',             -- Update
  'A',             -- Ativo
  '5FD32184'       -- hash de controle TOTVS
);
```

---

## Adicionando Regras

Para criar uma nova restrição, editar o corpo da function correspondente e adicionar um bloco `IF` para o componente desejado:

```sql
-- Exemplo: bloquear alteração do NCM quando o valor for = 50
if psComponente = 'dfnCodNBMSH' then
  if psValorComponente = '50' then   -- aqui o valor é sempre VARCHAR2
    return 'NCM desta família não pode ser alterado.';
  end if;
  return null;
end if;
```

Componentes disponíveis estão todos mapeados nas functions — cada `IF` corresponde a um campo do form.

> Para bloquear por valor do **próprio campo alterado**, usar `psValorComponente`. Para bloquear com base em outro campo (ex: família específica), é necessário uma consulta extra no corpo da function.

---

## Exemplo Ativo — Família 282

Atualmente, a function `ESPF_VALIDAFAMILIA` bloqueia qualquer alteração quando a família aberta for a de `SEQFAMILIA = 282`:

```sql
if psComponente = 'dfnSeqFamilia' then
  if psValorComponente = 282 then
    return 'Não é possível realizar alterações na família 282.';
  end if;
  return null;
end if;
```

`dfnSeqFamilia` é o primeiro campo validado ao abrir o cadastro — o bloqueio ocorre ao tentar salvar qualquer campo enquanto esta família estiver aberta.

---

## Campos Cobertos

### Família (`ESPF_VALIDAFAMILIA` — MAX0049)

**Aba Geral:** SeqFamilia · Descrição · REINF (Tipo Evento, NroServico, Tipo Repasse, Desc. Recurso) · Marca · Vasilhame · Arquivo Figura · Tabela Nutricional · Ficha Emergencial · Cód. Serviço · Sub Item · Tipo de Receita · SEFAZ-Comb.Solv. · Conserv. Doméstica · Certificado · Garantia Estendida/Fabricante · Cadastro Ativo · Tipo Modal Garantia · Qtd Parcela Etiqueta · Qtd Máx Transf. Locais · % Desc/Acrésc Setor

**Aba Dados Fiscais:** [[NCM]] · [[CEST]] · NVE · Litros Tab PIS/COFINS · IPI (Alíq, CST Entrada/Saída, Base, Isento, Outros, Classe/Código Enquadramento, Selo) · II (Alíq, Crédito Presumido, Outros, Transferência, Recebimento) · [[PIS]]/[[COFINS]] (CST Entrada/Saída, Natureza da Receita, % Red. Base) · ICMS (Alíq. Padrão, % Redução, PROTEGE GO, Cód. Tipo Mercadoria) · DAC-AL · Ind. Escritura Outros IE · Deduz [[ICMS]] Desonerado

### Produto (`ESPF_VALIDAPRODUTO` — MAX0091)

**Aba Geral:** SeqFamilia · Descrição (Completa, Reduzida, Genérica, Complemento) · Status (Cadastro, Compra, Venda) · SeqProduto · Prazo de Validade (Dia, Dia Saída, Mês, Nati Morto) · NroRegMinSaude · Tabela Nutricional · Balança (Preço Zero, Imp. Data Validade/Embalagem) · Especificação Detalhada · Nro Item Fixo NF · Temperatura · Alíq. Adjudicação · Produto Base / Secundário / Embalagem / Relacionado · Faixa de Tolerância · % Acréscimo (Custo, Preço) · Proporção Perda · Cálculos (Flex Positivo, Comissão Índice Mgm) · Cód. Produto Fiscal · Flags FISCI · Resolução 3166 · Proc. Fabricação · Composição por Lote · ANP/CODIF/GLP (campos combustível)

> A lista completa de componentes está nas próprias functions — cada `IF` documenta o campo correspondente com comentário.

---

## Trigger — Trava de Tributação na Divisão de Família

[Repositório: DDL-Objects-Oracle → NAGTRG_VALID_TRIB_FAMDIV.trg](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_VALID_TRIB_FAMDIV.trg)

Trigger Oracle nativa (não usa o mecanismo [[TOTVS]]) que bloqueia a alteração do campo `NROTRIBUTACAO` em `MAP_FAMDIVISAO` quando a nova [[Tributação]] não estiver configurada nos [[CGO|CGOs]] obrigatórios.

```
BEFORE UPDATE OF NROTRIBUTACAO ON MAP_FAMDIVISAO
```

### Lógica

Ao alterar a [[Tributação]] de uma divisão de [[Família]], a trigger verifica se a **nova tributação** (`NROTRIBUTACAO = :NEW`) possui mapeamento completo nos [[CGO|CGOs]] críticos em `MAP_TRIBUTACAOUF`:

| CGO | UF | Condição verificada |
|-----|----|---------------------|
| 76  | SP | Intraestadual SP · regime normal · SITUACAONF ≠ '060' · **sem** vínculo em `MAX_CODGERALCFOP` |
| 910 | RJ | Intraestadual RJ · regime normal · SITUACAONF ≠ '060' · **sem** vínculo em `MAX_CODGERALCFOP` |

A condição `NOT EXISTS` detecta se a tributação tem regra de [[CFOP]] na UF mas **não tem** o CGO associado em `MAX_CODGERALCFOP`. Quando falta configuração, monta a mensagem com os CGOs pendentes e lança `RAISE_APPLICATION_ERROR(-20001, ...)`.

Exemplo de erro exibido:
```
Não foi possível atualizar a tributação.
Configure a nova tributação no(s) CGO(s): 76/910 e tente novamente.
```

> O `RPAD(CHR(10), 500, CHR(10))` no final da mensagem preenche a caixa de erro com quebras de linha, tornando o aviso mais visível na tela do [[ERP]].
