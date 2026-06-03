---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[Pricing]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
  - "[[Software de Integração]]"
Open Tags:
  - "[[Etiqueta de Validade]]"
  - "[[Controle de Datas]]"
  - "[[Rebaixa]]"
Project: "[[Controle de Datas]]"
tags:
  - Projects
---
[[Etiqueta de Validade|Etiqueta]] dupla impressa no [[PDV]] para produtos em rebaixa de vencimento. Cada folha contém **dois lados idênticos** — o operador cola um no produto e mantém o outro para controle interno.

---
#### Alteração no layout da etiqueta padrão (Acrescentado Icone para Identificação, abaixo de "OFERTA"):

![[Pasted image 20260603074640.png|396]]

Criada a [[Function]] [NAGF_GRUPOPROMOC](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_GRUPOPROMOC.fnc) que busca o seqgrupopromoc, quando for = **10**, retorna o código do item para formação do código [[ZPL]] para impressão.
#### Layout Etiqueta Dupla

![[Pricing - Controle de Validade - Layout Etiqueta.png]]

| Campo | Origem | Observação |
|-------|--------|-----------|
| Descrição do Produto | MAP_PRODUTO.DESCCOMPLETA | Nome completo do produto |
| Preço na Rebaixa | `MRL_PROMOCESPECIALHIST.VLRPRECOPROMOC` | Preço definido na rebaixa |
| Código EAN da etiqueta | `MRL_PROMOCESPECIALHIST.CODACESSOESPECIAL` | EAN especial gerado por `NAG_GERA_EAN13_AUTO` — diferente do EAN original do produto |
| Código do Produto (PLU) | `MRL_PROMOCESPECIALHIST.SEQPRODUTO` | Código interno do produto no ERP |
| Data de Impressão | Gerado na emissão | Data/hora da impressão da etiqueta |
| Data de Validade | `MRL_PROMOCESPECIALHIST.DTAFIM` | Data limite do preço de rebaixa |
| Informativo | Fixo | "PRODUTO PRÓXIMO DA VALIDADE · SEM TROCA" |

---

## View de Emissão — `MRLV_PROMOCAOESPECIAL`

View que alimenta o grid de emissão de etiquetas no [[ERP]]. Alterada para controlar corretamente a quantidade de folhas a imprimir:

```sql
-- Etiqueta é dupla: divide por 2 e arredonda pra cima (CEIL)
-- Ex.: 11 produtos solicitados → CEIL(11/2) = 6 folhas → 12 lados impressos

CASE WHEN NVL(QTDEETIQEMITIDA, 0) = 0
     THEN CEIL(QTDESOLICITADA / 2)
     ELSE CEIL((QTDESOLICITADA - NVL(QTDEETIQEMITIDA, 0)) / 2)
END QTDESOLICITADA
```

Filtro de controle: só retorna itens onde ainda há etiquetas a emitir:

```sql
AND NVL(QTDEETIQEMITIDA, 0) * 2 <= QTDESOLICITADA
```

| Condição | Resultado |
|----------|-----------|
| `STATUS = 'A'` | Apenas promoções ativas |
| `QTDEETIQEMITIDA * 2 <= QTDESOLICITADA` | Filtra itens cujas etiquetas já foram totalmente emitidas |
| Quantidade exibida | Quantidade restante a emitir ÷ 2 (arredondado pra cima) |

---

## Parametrização — [[Software de Integração]]

O apontamento da [[Etiqueta de Validade]] é parametrizado dentro do **[[Software de Integração]]** (sistema de integração PDV/ERP):

---

## Fluxo de Emissão

```
Aprovação da rebaixa (STATUS → 'A')
           ↓
  MRLV_PROMOCAOESPECIAL (grid ERP)
  exibe quantidade restante ÷ 2
           ↓
  Operador aciona emissão no ERP
           ↓
  Software de Integração lê a view
  e envia para a impressora de etiquetas
           ↓
  MRL_PROMOCESPECIALHIST.QTDEETIQEMITIDA
  atualizado com a quantidade impressa
           ↓
  Próxima consulta ao grid exclui
  item (quantidade zerada)
```