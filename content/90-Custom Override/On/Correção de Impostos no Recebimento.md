---
title: Correção de Impostos no Recebimento
tags:
  - paliativo
  - impostos
  - recebimento
  - reforma-tributaria
Aplicado 26..017: true
---

# Correção de Impostos no Recebimento

[[Procedure]] com script para correção de impostos na entrada de recebimento. Inicialmente utilizado para corrigir impostos da [[Reforma Tributária]]. Posteriormente acrescido de outros paliativos descritos abaixo. [[XML]]

## Integração

Adicionado na `PKG_MLF_RECEBIMENTO` — Linha 7513:

```sql
NAGP_PALIATIVO_CORRIGE_IMPOSTOS(pnSeqAuxNotaFiscal);
```

### Paliativos

#### 1. Zera Impostos se Não Existirem no XML

**Regra:**
- Se o emissor (do grupo) não emite impostos, zera a entrada
- Se estiver ativa para o emissor do grupo, não deve zerar na entrada
- Ou se o fornecedor não enviou no XML e ainda não passou da data de obrigatoriedade

#### 2. Replica os Impostos do XML

Atualiza de acordo com o XML.

- Depende do [[PD]] `CGO_REP_XML_REFORMA`
- **PD:** Lista de CGOs que mantém as informações do XML sobre os novos impostos da Reforma Tributária no lançamento entre lojas do grupo

> **Extra para Reforma Tributária:** Arredonda os valores se a divergência for centavos. Atualmente apenas entre -0,05 e +0,05 centavos.

~~[[CGOs]] ant Config.: 59,243,143,55,130,121,1,2,652,52,101,18,65,939,128,203,74,51,127,900,128~~
#### 3. Correção de IPI — Importação Direta

Corrige IPI nas notas de importação (entrada nas lojas), pois está calculando IPI devido à empresa ser configurada como importadora.

- Depende do [[PD]] `REC_IND_ZERA_IPI_IMP`
- **PD:** Indica se zera o IPI na entrada de emissão de notas de empresa importadora do grupo. `S/N`

#### 4/5. Correção de ICMS Desonerado em Devoluções

Corrige ICMS Desonerado na entrada da devolução, pois a alteração do CGO recalcula e pega a atual.

- Depende do [[PD]] `DEV_CGO_ZERA_DESON`
- **PD:** Lista de CGOs que zera o imposto de ICMS Desonerado na entrada de devoluções do grupo

#### 6. Corrige Despesa Fora NF na Importação Direta

Corrige Despesa Fora NF (CBS+IBS) nas entradas/emissões de NFs de Importação Direta.

- Depende do [[PD]] `IMP_INDCORRIGEDESPFORANF`
- **PD:** Indica se altera o valor Despesa Fora NF (Soma CBS+IBS da DI) na NF de Importação

#### 7. Impostos da Reforma em Notas de Produtor Rural

Corrige/Recalcula **Produtor Rural** pois não está pegando cenários atuais na versão.
