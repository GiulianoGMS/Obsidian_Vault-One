---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
  - "[[PJ-Regua-de-Cobranca]]"
Squads:
  - "[[Comercial]]"
  - "[[TI]]"
  - "[[Contas à Receber]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Acordos]]"
  - "[[E-mail]]"
  - "[[Régua de Cobrança]]"
  - "[[Elegíveis]]"
Date: 2026-09-03
Type:
Project: "[[Régua de Cobrança - Implementação]]"
tags:
  - Projects
---

> [!info] Referência
> [GiulianoGMS/PJ-Regua-de-Cobranca — NAGV_BASE_REGUA_COBRANCA_ELEGIVEIS.sql](https://github.com/GiulianoGMS/PJ-Regua-de-Cobranca/blob/main/NAGV_BASE_REGUA_COBRANCA_ELEGIVEIS.sql)
> [GiulianoGMS/PJ-Regua-de-Cobranca — NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS.prc](https://github.com/GiulianoGMS/PJ-Regua-de-Cobranca/blob/main/NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS.prc)
> Procedure original: [[Régua de Cobrança - Implementação]]
> Variante genérica: [[Régua de Cobrança - Notificação Genérica]]

---

## Contexto

Variante da [[Régua de Cobrança]] restrita a um grupo de [[Fornecedor|fornecedores]] **elegíveis** — definidos por rede (`GE_REDEPESSOA`) na tabela `NAGT_DEPARA_ELEGIVEIS_030926` — e aplicável apenas a acordos incluídos antes de `03/08/2026`. Chamada no **mesmo job** que `NAGP_EMAIL_REGUA_COBRANCA_AGRUP`, porém com fluxo distinto: usa uma view dedicada como fonte de dados e persiste o log com `TIPO = 'Elegiveis'` para isolar o controle de envios.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `NAGV_BASE_REGUA_COBRANCA_ELEGIVEIS` | View | Fonte de dados — filtra acordos elegíveis e calcula `NIVEL_REGUA` |
| `NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS` | Procedure | Monta e envia o e-mail genérico; grava log por acordo/parcela |
| `NAGT_DEPARA_ELEGIVEIS_030926` | Tabela | Parametrização de redes elegíveis (`SEQREDE`) |
| `NAGT_LOG_ENVIO_ACO_EMAIL` | Tabela | Log de envios — `TIPO = 'Elegiveis'` separa este fluxo |
| `FI_TITULO` | Tabela | Acordos comerciais (`CODESPECIE LIKE 'AC%'`) |
| `GE_REDEPESSOA` | Tabela | Vínculo fornecedor × rede — base do filtro de elegíveis |
| `GE_PESSOA` | Tabela | Nome/razão social do fornecedor |
| `MAF_FORNECCONTATO` | Tabela | E-mail do representante (`EMAILACORDO`) |
| `MSU_ACORDOPROMOC` | Tabela | Comprador vinculado ao acordo |

---

## View — `NAGV_BASE_REGUA_COBRANCA_ELEGIVEIS`

Estruturada em três camadas:

### Camada 1 — Base (BS)

Seleciona acordos abertos via `FI_TITULO` com os seguintes filtros:

| Filtro | Critério |
|---|---|
| `ABERTOQUITADO = 'A'` | Apenas títulos em aberto |
| `SITUACAO != 'C'` | Exclu cancelados |
| `CODESPECIE LIKE 'AC%'` | Apenas acordos comerciais |
| `DTAINCLUSAO < DATE '2026-08-03'` | Somente acordos pré-existentes (elegíveis definidos em 03/08) |
| `JOIN NAGT_DEPARA_ELEGIVEIS_030926` | Restringe ao grupo de redes parametrizadas |
| Vencimento CASE | Deve estar em D+1, D+6, D+11 ou D+16+ para disparar |
| `NOT EXISTS TIPO='Regua'` | Exclui acordos que já passaram pelo fluxo original (mutuamente exclusivos) |
| `NOT EXISTS TIPO='Elegiveis' hoje` | Anti-duplicidade diária |
| `EMAIL_REP IS NOT NULL` | Apenas acordos com e-mail de representante cadastrado |

**Dias de disparo (janelas de vencimento):**

| Dias desde vencimento | Nível esperado |
|---|---|
| -1 (ontem venceu) | 1 — primeiro contato |
| -6 | 2 |
| -11 | 3 |
| -16 ou mais | 4 |

### Camada 2 — Cálculo de NIVEL_REGUA

```sql
CASE WHEN NOT EXISTS (log para o acordo + EMAIL_REP) THEN 1
     ELSE (SELECT CASE WHEN DATA_ENVIO = hoje - 6  THEN 2
                       WHEN DATA_ENVIO = hoje - 11 THEN 3
                       WHEN DATA_ENVIO <= hoje - 16 THEN 4 END
             FROM NAGT_LOG_ENVIO_ACO_EMAIL
            WHERE NRO_ACORDO = ... AND EMAIL_DESTINO = EMAIL_REP)
END NIVEL_REGUA
```

- NIVEL 1 → sem histórico de envio
- NIVEL 2 → último envio há 6 dias
- NIVEL 3 → último envio há 11 dias
- NIVEL 4 → último envio há 16+ dias

### Camada 3 — Filtro final

```sql
WHERE NIVEL_REGUA IS NOT NULL
```

Descarta linhas cujo vencimento não se enquadra em nenhuma janela de disparo.

---

## Procedure — `NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS`

### Parâmetros

Idênticos à `NAGP_EMAIL_REGUA_COBRANCA_AGRUP`:

```sql
NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS(
  psEmail               VARCHAR2,
  psEnviaTICopia        VARCHAR2,
  psEnviaCARCopia       VARCHAR2,
  psEnviaFinFornecCopia VARCHAR2,
  psEnviaCompCopia      VARCHAR2,
  psEmailDir            VARCHAR2,
  psNivelRegua          NUMBER
)
```

### Fluxo

```
Orquestrador (mesmo job do AGRUP)
         │
         ▼
NAGP_EMAIL_REGUA_COBRANCA_ELEGIVEIS (por representante + nível)
         │
         ├─ Anti-duplicidade diária   (DATA_ENVIO >= TRUNC(SYSDATE), TIPO='Elegiveis')
         ├─ Anti-resend crítico       (≥ 4 envios desde 2026-09-03 + acordo ainda aberto)
         │
    vsQtd = 0? → RETURN
         │
         ▼
Monta e-mail genérico (sem detalhes de acordo — mesmo padrão do AGRUP)
         │
         ▼
Loop por acordo/parcela → INSERT NAGT_LOG_ENVIO_ACO_EMAIL (TIPO='Elegiveis')
         │
         ▼
SP_ENVIA_EMAIL → 1 envio consolidado
         │
         ▼
COMMIT
```

### Diferença de log — `TIPO = 'Elegiveis'`

| Campo | Valor gravado |
|---|---|
| `TIPO` | `'Elegiveis'` |
| `COD_COMPRADOR` | `0` (fixo — comprador não é relevante aqui) |
| `EMAIL_DESTINO` | Concatenação de todos os destinatários |

### Mensagem por Nível

Idêntica à `NAGP_EMAIL_REGUA_COBRANCA_AGRUP`:

| Nível | Mensagem de urgência |
|---|---|
| 1 | *"… bloqueio nos pedidos em até **15 dias**."* |
| 2 | *"… bloqueio nos pedidos em até **10 dias**."* |
| 3 | *"… bloqueio nos pedidos em até **5 dias**."* |
| ≥ 4 | *"… pedidos irão permanecer **bloqueados** até a regularização."* |

---

## Análise de Falhas

> [!bug] **1 — NIVEL sempre retorna 1 (crítico)**
> Na view, o cálculo do `NIVEL_REGUA` usa `XXX.EMAIL_DESTINO = EMAIL_REP` para verificar se já há histórico de envio. Porém o campo `EMAIL_DESTINO` gravado no log é uma **concatenação** de todos os destinatários (`comprador;financeiro;rep;TI;CAR;diretoria`), nunca igual ao e-mail isolado do representante.
>
> Resultado: `NOT EXISTS` sempre verdadeiro → `NIVEL_REGUA` sempre 1 → escalação nunca ocorre.
>
> **Fix:** substituir `XXX.EMAIL_DESTINO = EMAIL_REP` por `XXX.EMAIL_DESTINO LIKE '%' || EMAIL_REP || '%'` — exatamente como está na cláusula de anti-resend da procedure (`AC.EMAIL_DESTINO LIKE '%'||A.EMAIL_REP||'%'`).

> [!bug] **2 — ORA-01427: subquery do NIVEL sem MAX / ROWNUM**
> O subquery que calcula o nível quando já existe histórico:
> ```sql
> SELECT CASE WHEN TRUNC(DATA_ENVIO) - TRUNC(SYSDATE) = -6 THEN 2 ...
>   FROM NAGT_LOG_ENVIO_ACO_EMAIL XXX
>  WHERE NRO_ACORDO = ... AND EMAIL_DESTINO = EMAIL_REP
> ```
> Não tem `MAX()`, `ROWNUM = 1` nem `FETCH FIRST 1 ROW ONLY`. Se o acordo tiver mais de um log, lança `ORA-01427` em runtime. Além disso, não filtra `TIPO = 'Elegiveis'`, podendo capturar datas de outros processos.
>
> **Fix:** usar `MAX(DATA_ENVIO)` na subquery e adicionar `AND TIPO = 'Elegiveis'`.

> [!bug] **3 — Data hardcoded no anti-resend da procedure**
> ```sql
> AND AC.DATA_ENVIO >= DATE '2026-09-03'
> ```
> A data está fixada em `03/09/2026` (data de escrita do código). Acordos enviados antes dessa data nunca atingem a contagem de 4, tornando o anti-resend inoperante para o histórico anterior.
>
> **Fix:** usar `DATE '2026-08-03'` (data de corte dos elegíveis) ou um parâmetro dinâmico para manter consistência com o critério de inclusão dos acordos.

> [!warning] **4 — Inconsistência SELECT principal × FOR LOOP de log**
> O `SELECT` que calcula `vsQtd` aplica o anti-resend (≥ 4 envios). O `FOR LOOP` que grava o log aplica apenas o filtro diário — a cláusula de anti-resend está **comentada** no loop.
>
> Cenário problemático: se `vsQtd > 0` (algum acordo passou pelo anti-resend), o loop pode logar acordos de outro `NIVEL_REGUA` ou de outro representante que passem apenas o filtro diário mas que deveriam ser bloqueados pelo anti-resend.
>
> **Fix:** replicar a cláusula `NOT EXISTS` do anti-resend no `FOR LOOP`, ou mover a lógica para a view.

> [!note] **5 — `NOT EXISTS TIPO='Regua'` sem filtro de data**
> ```sql
> AND NOT EXISTS (SELECT 1 FROM NAGT_LOG_ENVIO_ACO_EMAIL XX
>                  WHERE XX.NRO_ACORDO = F.NROTITULO AND XX.TIPO = 'Regua')
> ```
> O comentário diz "evita duplicidade de envio no dia", mas a cláusula exclui o acordo **para sempre** se algum dia passou pelo fluxo Regua. Provavelmente intencional (os dois fluxos são mutuamente exclusivos), mas o comentário está enganoso.
