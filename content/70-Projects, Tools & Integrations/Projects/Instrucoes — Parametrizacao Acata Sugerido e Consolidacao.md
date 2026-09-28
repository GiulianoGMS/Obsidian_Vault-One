---
Squads:
  - "[[Comercial]]"
  - "[[TI]]"
Open Tags:
  - "[[Lote de Compra]]"
  - "[[Sugestão de Compra]]"
  - "[[Arredondamento]]"
Date: 2026-09-11
Type:
---

> [!info] Relacionado
> Regra técnica: [[Lote de Compras — Acata Sugerido e Consolidação.md]]
> Modelo para preencher: `Modelo — Parametrizacao Acata Sugerido e Consolidacao.csv`

# Como preencher a parametrização

Preencha **uma linha por combinação de Comprador + Fornecedor** que deve entrar na regra de Acata Sugerido / Consolidação.

| Campo | O que informar | Obrigatório |
|---|---|---|
| **COMPRADOR** | Código (SEQ) ou nome do comprador | ✅ |
| **FORNECEDOR** | Código do fornecedor **ou** `TODOS` | ✅ |
| **ARREDONDA** | `S` ou `N` | ✅ |
| **PERCENTUAL** | Percentual mínimo para arredondar (ex.: `60`). Só quando ARREDONDA = `S` | ⛔ se `N` |
| **OBSERVACAO** | Campo livre (opcional) | ➖ |

---

## ⚠️ Atenção 1 — Fornecedor em branco / TODOS

- Preencher **FORNECEDOR = `TODOS`** (ou deixar em branco) faz a regra valer para **qualquer fornecedor daquele comprador**.
- Isso grava `SEQFORNECEDOR = NULL` na tabela.
- Se você quer a regra apenas para **um fornecedor específico**, informe o código dele. Não deixe em branco por engano — senão o comportamento vai atingir todos os lotes daquele comprador.

## ⚠️ Atenção 2 — Arredondamento (ARREDONDA = S)

- `ARREDONDA = S` só tem efeito em **lote consolidado com CD** (o sistema detecta isso sozinho pela empresa do lote). Em lote sem CD, ele é simplesmente ignorado.
- Se marcar `S` **sem informar PERCENTUAL**, o sistema usa o percentual padrão do produto (`PERCVARIACAOSUG`). Se esse também não existir, **não arredonda**.
- O resultado do arredondamento depende do cadastro de **palete/lastro** do produto no CD (`PALETELASTRO` / `PALETEALTURA`). Se esses valores estiverem errados, o arredondamento sai errado. Use a coluna OBSERVACAO para sinalizar produtos que costumam arredondar de forma estranha, para validarmos o cadastro antes.
- O arredondamento **nunca reduz** a quantidade — só mantém ou completa lastro/palete.

---

## Observações importantes

- **Não precisa informar o "modo" (Acata ou Consolidação) nem o CD.** O sistema decide automaticamente em tempo real, pela presença de um CD no lote. Você só define comprador, fornecedor e se arredonda.
- A regra só atua em **lotes do tipo Consolidado (`C`)**.
