---
Language:
  - "[[SQL]]"
Repository:
  - "[[Oracle_Auto_Reports]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[WhatsApp]]"
  - "[[Monitoramento]]"
  - "[[Alertas]]"
Type: "[[Procedure]]"
tags:
  - Projects
---

[Repositório no GitHub →](https://github.com/GiulianoGMS/Oracle_Auto_Reports)

Sistema de **monitoramento automático do banco Oracle** com envio de alertas e execução de comandos via [[WhatsApp]], usando a [[API]] [[TextMeBot]] + UTL_HTTP.

---

## Arquitetura

```
NAGP_ENVIO_WHATS  (JOB agendado)
├── Grupo GERP    → 10 procedures de alerta (via Group_Id — envia ao grupo WA)
├── Grupo PDV     → 3 procedures (erros DB + falhas carga + sessões longas MONITORPDV)
├── Grupo ESP/SD  → job failures direcionados
├── Grupo BI      → alertas de visões BI
├── Grupo GSD     → grupos WA (carga PDV, exportação, BI, SEFAZ)
├── Grupo CFG     → alertas de serviço interrompido
└── Grupo UNOUS   → erros da API Unous
```

**API de envio:** [[TextMeBot]] (`http://api.textmebot.com/send.php`)
**Método:** UTL_HTTP via GET com parâmetros URL-encoded
**Anti-spam:** `DBMS_SESSION.SLEEP(10)` entre cada [[mensagem]] enviada
**Parâmetro `psNroTelefone VARCHAR2`:** aceita tanto número de telefone individual quanto `Group_Id` de grupo — permite que as procedures enviem para qualquer destino sem alteração de assinatura

---

## Objetos

### Orquestrador 

| Procedure          | Descrição                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `NAGP_ENVIO_WHATS` | [[Procedure]] principal chamada pelo [[Job]]. Itera sobre `NAGT_API_CALL_NUMBERS` e dispara os [[alertas]] conforme o [[TYPE]] do destinatário |

### Alertas (prefixo `NAGP_WTS_V2_`)

| Procedure                             | Trigger                                                                                                                                                                                                                                                                                       | Fonte                                                                                                                 |                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `NAGP_WTS_V2_INVALIDOBJECTS`          | Objetos inválidos no banco                                                                                                                                                                                                                                                                    | `NAGV_INVALID_OBJECTS` + `NAGV_INVALID_OBJECTS_DW` (PROD e DW/[[BI]])                                                 |                                                                |
| `NAGP_WTS_V2_JOB_RUNFAILURES`         | [[Job]]                                                                                                                                                                                                                                                                                       | [[Jobs]] falhados nos últimos 10 min                                                                                  | `ALL_SCHEDULER_JOB_RUN_DETAILS`                                |
| `NAGP_WTS_V2_JOB_RUNFAILURES_ESP`     | [[Job]]                                                                                                                                                                                                                                                                                       | [[Jobs]] falhados direcionados por destinatário específico                                                            | `ALL_SCHEDULER_JOB_RUN_DETAILS` ← `NAGT_WTS_SCHED_DIR_CONTROL` |
| `NAGP_WTS_V2_LOCKS`                   | Sessions bloqueadas por > 10 min (600 s)                                                                                                                                                                                                                                                      | `GV$SESSION` — exibe bloqueada e bloqueadora com hint para `NAGP_KILL_SESSION`                                        |                                                                |
| `NAGP_WTS_V2_TB_LOGDBERRO`            | Erros de banco registrados no [[Monitor PDV]]                                                                                                                                                                                                                                                 | `MONITORPDV.TB_LOGDBERRO`                                                                                             |                                                                |
| `NAGP_WTS_V2_TB_LOGFALHACARGAMONITOR` | Falhas de carga do [[Monitor PDV]]                                                                                                                                                                                                                                                            | `MONITORPDV.TB_LOGFALHACARGAMONITOR`                                                                                  |                                                                |
| `NAGP_WTS_V2_TB_ULTCARGAMONITOR`      | Atraso na última [[carga]] do [[Monitor PDV]] — alerta quando o intervalo excede o limite configurado                                                                                                                                                                                         | `MONITORPDV.TB_ULTCARGAMONITOR`                                                                                       |                                                                |
| `NAGP_WTS_V2_LONGTIME_SESSION`        | Sessões [[Oracle]] ativas há ≥ 3 horas (exceto sqlplus) — dispara a cada ~20 min entre 04h–21h; `psUserPDV='All'` alerta todos, `'Monitorpdv'` filtra apenas esse usuário; inclui hint `NAGP_KILL_SESSION(SID, SERIAL#, INST_ID)`                                                             | `NAGV_DBMONITOR_WTS`                                                                                                  |                                                                |
| `NAGP_WTS_V2_CONTROLECARGA_PDV_CTD`   | Falhas de carga [[PDV]] (status 3 e 4) — versão com contador de persistência; dispara entre 08h–20h a cada 20 min (minutos 00, 20, 40); exibe indicador de nível por loja/tabela: ▱▱▱▱ (1×) → ▰▱▱▱ (2–3×) → ▰▰▱▱ (4–6×) → ▰▰▰▱ (7–10×) → ▰▰▰▰ (11+×); inclui tabelas `%CCT%` desde 2026-06-01 | `MONITORPDV.TB_CONTROLECARGAPDV` ← `NAGV_CONTROLECARGAPDV_CTD` (contagem do dia); insere em `NAGT_CONTROLECARGAPDV`   |                                                                |
| `NAGP_WTS_V2_STATUS_EXP_INT_PDV`      | Exportação de documentos [[PDV]] atrasada > 5 min (horário 07–21h)                                                                                                                                                                                                                            | `NAGV_STATUS_EXP_INT_PDV_v2` + `CONSINCO.VENDAS_PDV` + `@BI` (valor de venda comparado)                               |                                                                |
| `NAGP_WTS_V2_ALERTAS_BI`              | Visão [[Qlik Sense]] desatualizada além do threshold configurado por visão na tabela                                                                                                                                                                                                          | `NAGT_CONTROLE_ATUALIZACAO_BI` — threshold variável por `VISAO`                                                       |                                                                |
| `NAGP_WTS_V2_ALERTAS_BOT_DOWN`        | Serviço de captura de dados interrompido (sem registro recente)                                                                                                                                                                                                                               | `NAGT_CONTROLE_ATUALIZACAO_BI` — DTAREGISTRO atrasado além de `MIN_TMP_REGISTRO` por visão                            |                                                                |
| `NAGP_WTS_V2_ALERTAS_SEFAZ`           | Webservice SEFAZ com tempo de resposta > 3 s **ou** fora do ar (`SVC = 'Sim'`) nos últimos 25 min — dispara entre 07h–20h nos minutos 00/02; envia pa GERP e GSD                                                                                                                              | `ERP_INTEGRATION.NAGT_NFE_STATUS_UFS` — verifica `TEMPO_RESPOSTA > 3` e `SVC = 'Sim'` na janela de 25 min             |                                                                |
| `NAGP_WTS_V2_LOG_API_UNOUS`           | Erros registrados na API [[Unous]] não processados — envia uma mensagem por registro com data/hora e texto do erro; sleep de 5 s entre envios                                                                                                                                                 | `NAGT_LOG_API_UNOUS` (`INDLOGPROCESSADO = 'N'`); marcação como processado (`'S'`) feita pelo orquestrador após o loop |                                                                |

### Exemplos de Mensagem por Alerta

> Textos reais montados por cada procedure (decodificados do formato URL-encoded enviado à [[TextMeBot]]). Os `*asteriscos*` são a marcação de **negrito** do [[WhatsApp]].

**`NAGP_WTS_V2_INVALIDOBJECTS`**
```
🚨 *Report: Existem objetos invalidos no banco:*

*Data Base:* NAGUMO PROD
*Owner:* CONSINCO
*Object Name:* NAGP_EXEMPLO
*Object Type:* PROCEDURE
*Created:* 01/09/2025 10:22:15
*Last DDL Time:* 02/09/2026 08:00:00
*Status:* INVALID

*Para recompilar objs:* 
NAGP_RECOMPILA_OBJ()
```

**`NAGP_WTS_V2_JOB_RUNFAILURES`**
```
🚨 *Report: Houve falha de execucao na(s) rotina(s) abaixo:*

*Log_Date:* 02-SEP-2026
*Job_Name:* NAGJ_CARGA_EXEMPLO
*Error:* ORAx12801 error signaled in parallel query server ...
*Instance_ID:* 1
```

**`NAGP_WTS_V2_JOB_RUNFAILURES_ESP`** *(direcionado — inclui Data Base)*
```
🚨 *Report: Houve falha de execucao na(s) rotina(s) abaixo:*

*Data Base:* CONSINCO
*Log_Date:* 02-SEP-2026
*Job_Name:* NAGJ_CARGA_EXEMPLO
*Error:* ORAx12801 error signaled in parallel query server ...
*Instance_ID:* 1
```

**`NAGP_WTS_V2_LOCKS`**
```
🚨 *Report: Sessão bloqueada detectada:*

*Sessão bloqueadora:* 1234 (User: CONSINCO)
*Serial:* 5678 - Instance ID: 1
*Status:* INACTIVE
*OSUser:* oracle
*Máquina:* SRV-DB01
*Programa:* sqlplus.exe
*Logon:* 02/09/2026 08:15:00

*Sessão bloqueada:* 4321 (User: MONITORPDV)
*Serial:* 8765
*Status:* ACTIVE
*OSUser:* monitorpdv
*Máquina:* SRV-APP02
*Programa:* JDBC Thin Client
*Duração:* 12 min
*Evento de espera:* enq: TX - row lock contention
*Evento bloqueador:* SQL*Net message from client

*Para encerrar sessao:*
NAGP_KILL_SESSION(1234, 5678, 1)
```

**`NAGP_WTS_V2_TB_LOGDBERRO`**
```
🚨 *Report: Existem Erros na Carga Monitor:*

*Data Evento:* 02/09/2026
*Username:* MONITORPDV
*NlsLang:* BRAZILIAN PORTUGUESE
*IpcClient:* 10.0.0.15
*OsUser:* monitorpdv
*Terminal:* PDV-05
*Modulo:* CargaMonitor
*Identifier:* 12345
*MsgErro:* ORAx00001 unique constraint violated
*Action:* INSERT
*Erro em:* TB_LOGDBERRO
```

**`NAGP_WTS_V2_TB_LOGFALHACARGAMONITOR`**
```
🚨 *Report: Existem Erros na Carga Monitor:*

*SeqLog:* 987
*Tabela:* TB_PRODPRECO
*Data:* 02/09/2026
*TipoCarga:* P
*Mensagem:* Falha ao carregar pacote de precos
*Replicacao:* S
*Erro em:* TB_LOGFALHACARGAMONITOR
```

**`NAGP_WTS_V2_LONGTIME_SESSION`**
```
⏱️ *Sessão ativa há mais de 3 horas*

*Ambiente:* PROD
*Usuário:* MONITORPDV
*Sessão:* 4321
*Serial:* 8765
*Instância:* 1
*Status:* ACTIVE
*Duração:* 3:45:12
*Logon:* 02/09/2026 05:00:00
*SO:* monitorpdv
*Terminal:* SRV-APP02
*Programa:* JDBC Thin Client
*PID:* 20458
*Action:* CargaMonitor

*Para encerrar a sessão:*
NAGP_KILL_SESSION(4321, 8765, 1)
```
> Campos *Client Identifier*, *Client Info*, *Action* e *Job* só aparecem quando preenchidos.

**`NAGP_WTS_V2_CONTROLECARGA_PDV_CTD`**
```
🚨 *Report: Falhas Registradas No Controle De Carga Do PDV:*

*Tabela:* TB_PRODPRECO
*Status:* 3 - Falha no envio do pacote
  
 ▰▰▱▱ *Loja:* 05 *| Checkouts:* 1, 2, 3.
 ▱▱▱▱ *Loja:* 07 *| Checkouts:* 2.

*Tabela:* TB_FAMILIA
*Status:* 4 - Falha ao tentar carregar o pacote
  
 ▰▰▰▰ *Loja:* 05 *| Checkouts:* 1.
```
> O indicador de nível reflete a persistência do dia (`QTD_DIA`): ▱▱▱▱ (1×) → ▰▱▱▱ (2–3×) → ▰▰▱▱ (4–6×) → ▰▰▰▱ (7–10×) → ▰▰▰▰ (11+×).

**`NAGP_WTS_V2_STATUS_EXP_INT_PDV`**
```
🚨 *Report: Ultima Exportacao de Documentos ha mais de 8 minutos.*

*Ultima Exportacao:* 02/09/2026 08:52:00
*Qtd Pendente Exportacao:* 15
*Qtd Pendente Importacao:* 0
*Sessoes:* 3
*Qtd Docto Integrado:* 1240
*Ultima Carga de Preco:* 02/09/2026 06:30:00

💰 *Valor Venda Atual PDV:* 125.430,90
📊 *Valor Venda Atual BI:* 125.430,90
```

**`NAGP_WTS_V2_ALERTAS_BI`**
```
🚨 *Report: Qlik Sense Alert* 📊

*Visao:* Vendas
*Ultima Atualizacao:* 02/09/2026 08:15:00
*Atraso:* 35 min
```

**`NAGP_WTS_V2_ALERTAS_BOT_DOWN`**
```
⛔ *Report: Servico Interrompido (Captura de dados)*

*Visao:* Estoque
*Ultimo Registro:* 02/09/2026 07:30:00
*Atraso:* 45 min
```

**`NAGP_WTS_V2_ALERTAS_SEFAZ`**
```
🧾 *NFE/NFCE - Alerta SEFAZ Intermitente!*

*UFs:* RJ, SP
*Tipos:* NFCE/NFE

🔸 Notas Fiscais (NFE) devem apresentar lentidão nas emissões!
🔸 Notas Fiscais (NFCE) devem apresentar lentidão nas emissões!
```

**`NAGP_WTS_V2_LOG_API_UNOUS`** *(uma mensagem por registro; sleep de 5 s)*
```
🌐 *Erro detectado na API Unous*

*Data:* 02/09/2026 08:00:00
*Erro:* Timeout ao consumir endpoint /v1/produtos
```

> [!note] `NAGP_WTS_V2_TB_ULTCARGAMONITOR`
> Pendente anotar

---

### Bidirecional — Execução de Comandos via [[WhatsApp]]

| Procedure | Função |
|-----------|--------|
| `NAGP_REG_ANSWER_WTS` | Registra mensagem recebida do [[WhatsApp]] em `NAGT_ANSWERS_WTS` (`INDPROCESSADO = 'N'`) |
| `NAGP_EXEC_COMMAND_WTS` | Lê fila, extrai padrão `NAGP_*(...)` ou `NAGJ_*` via regex, executa via `EXECUTE IMMEDIATE`; loga em `NAGT_ANSWERS_WTS_LOG` e chama `NAGP_WTS_V2_RETURN_CM(psID NUMBER)` |
| `NAGP_WTS_V2_RETURN_CM` | Recebe `psID NUMBER`; busca o `GROUP_ID` do tipo `GERP` em `NAGT_API_CALL_NUMBERS`; envia confirmação de execução (comando, autor via `APELIDO`, output, status) **ao grupo WA** |

---

## Grupos de Destinatários (`NAGT_API_CALL_NUMBERS.TYPE`)

| Tipo         | Alertas recebidos                                                            |                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GERP`       | **Grupo WA** (via `Group_Id`) — objetos inválidos · jobs falhados · locks · erros DB · falhas de carga · última carga monitor · exportação [[PDV]] · bot down · **sessões longas (todos usuários)** · **alertas SEFAZ** | retornos de comandos remotos também enviados ao grupo |
| `PDV`        | Erros DB · falhas de carga · **sessões longas (somente MONITORPDV)**         |                                                                                                                                                 |
| `ESP` / `SD` | Job                                                                          | Jobs falhados direcionados mapeados em `NAGT_WTS_SCHED_DIR_CONTROL`                                                                             |
| `BI`         | Alertas de visões [[Qlik Sense]] desatualizadas                              |                                                                                                                                                 |
| `GSD`        | Grupos [[WhatsApp]]: controle de carga [[PDV]] + exportação + alertas [[BI]] + **alertas SEFAZ** |                                                                                                                                                 |
| `CFG`        | Apenas alertas de serviço interrompido (bot down)                            |
| `UNOUS`      | Erros da API Unous (`NAGP_WTS_V2_LOG_API_UNOUS`)                             |                                                                                                                                                 |

> `PERM_CMD = 'S'` habilita execução de comandos remotos para o número cadastrado.

---

## Segurança na Execução de Comandos

- Regex extrai apenas padrões `NAGP_[A-Z0-9_]+\([^)]*\)` ou `NAGJ_[A-Z0-9_]+` — outros textos são ignorados
- [[Job|Jobs]] (`NAGJ_`) executados via `DBMS_SCHEDULER.RUN_JOB`, procedures via `EXECUTE IMMEDIATE 'BEGIN ... END'`
- Erros capturados em `WHEN OTHERS THEN` e devolvidos ao solicitante como mensagem de retorno via [[WhatsApp]]
- Log completo em `NAGT_ANSWERS_WTS_LOG` (comando · data · status · ID)

---

## Tabelas de Suporte

| Tabela | Uso |
|--------|-----|
| `NAGT_API_CALL_NUMBERS` | Destinatários: `NROTELEFONE`, `APIKEY`, `GROUP_ID`, `TYPE`, `STATUS`, `PERM_CMD` |
| `NAGT_ANSWERS_WTS` | Fila de mensagens recebidas; `INDPROCESSADO` controla o processamento |
| `NAGT_ANSWERS_WTS_LOG` | Histórico de comandos executados remotamente |
| `NAGT_WTS_SCHED_DIR_CONTROL` | Mapeamento JOB_NAME → TYPE para alertas direcionados (ESP/SD) |
| `NAGT_CONTROLE_ATUALIZACAO_BI` | Configuração e controle por visão [[BI]] — ver detalhes abaixo |
| `NAGT_CONTROLECARGAPDV` | Histórico intra-dia de falhas de carga PDV — alimentado por `NAGP_WTS_V2_CONTROLECARGA_PDV_CTD`; base para o contador de persistência |
| `NAGV_CONTROLECARGAPDV_CTD` | View que agrega a contagem de ocorrências do dia por empresa e tabela (`QTD_DIA`); usada pelo indicador de nível ▱/▰ |
| `NAGT_LOG_API_UNOUS` | Log de erros da API Unous: `DTALOG`, `ERRO`, `INDLOGPROCESSADO` (`'N'` = pendente, `'S'` = enviado) |
| `ERP_INTEGRATION.NAGT_NFE_STATUS_UFS` | Status dos webservices SEFAZ (NF-e / NFC-e) por UF — colunas `TEMPO_RESPOSTA` (segundos) e `SVC` (`'Sim'` = fora do ar); alimentado pelo job `NAGJ_NFE_STATUS_UFS` via `[[Alerta Status SEFAZ]]` |

---

## Regras de Alerta — `NAGT_CONTROLE_ATUALIZACAO_BI`

Tabela central que configura **individualmente por visão** quais alertas devem ser disparados e com quais thresholds. Cada linha representa uma visão monitorada do [[BI]].

| Coluna              | Tipo     | Descrição                                                                        |
| ------------------- | -------- | -------------------------------------------------------------------------------- |
| `VISAO`             | VARCHAR2 | Nome da visão/processo monitorado (ex: [[Vendas]], [[Estoque]])                  |
| `DTAREGISTRO`       | DATE     | Último instante em que o serviço de captura registrou dados                      |
| `DTAATUALIZACAO_BI` | DATE     | Último instante em que a visão foi efetivamente atualizada no [[BI]]             |
| `STATUS_ALERTA`     | VARCHAR2 | `'A'` = monitoramento ativo; outro valor = desativado                            |
| `MIN_TMP_REGISTRO`  | NUMBER   | Threshold em minutos para detectar **serviço interrompido** (`ALERTAS_BOT_DOWN`) |

### Lógica dos dois alertas

**`NAGP_WTS_V2_ALERTAS_BI`** — detecta dado desatualizado no [[BI]] enquanto o serviço ainda está rodando:
```
DTAREGISTRO recente (últimos 10 min)       → serviço de captura está ativo
DTAATUALIZACAO_BI defasada além do limite  → mas o dado do BI não foi atualizado
STATUS_ALERTA = 'A'
```
> O threshold de atraso aceitável para `DTAATUALIZACAO_BI` é configurado **por linha da tabela** — visões mais críticas podem ter um limite menor do que visões menos sensíveis.

**`NAGP_WTS_V2_ALERTAS_BOT_DOWN`** — detecta que o serviço de captura parou de registrar:
```
DTAREGISTRO atrasado além de MIN_TMP_REGISTRO minutos  → serviço não está respondendo
STATUS_ALERTA = 'A'
```
> `MIN_TMP_REGISTRO` é lido diretamente da linha (`X.MIN_TMP_REGISTRO`), portanto cada visão do [[BI]] tem sua própria tolerância configurada.

---

## Como obter o [[Group ID]] do [[WhatsApp]]

O `Group_Id` é necessário para cadastrar um grupo (como o GERP) na tabela `NAGT_API_CALL_NUMBERS`. A [[TextMeBot]] expõe um endpoint específico para recuperá-lo a partir do link de convite do grupo.

> [!warning] Pré-requisito
> O número cadastrado na [[TextMeBot]] precisa ser **membro do grupo** antes de executar a consulta.

### Passo a Passo

**1 — Obter o código do link de convite**

Copiar o link de convite do grupo WhatsApp. O código é a parte final da URL:

```
https://chat.whatsapp.com/CODIGO_CONVITE
                           ^^^^^^^^^^^^^^
```

---

**2 — Consultar o endpoint `group_info`**

Fazer uma requisição GET substituindo `CODIGO_CONVITE` e `SUA_API_KEY`:

```
http://api.textmebot.com/send.php?group_info=CODIGO_CONVITE&text=teste&apikey=SUA_API_KEY
```

---

**3 — Localizar o Group ID na resposta**

A resposta conterá uma linha no formato:

```
Group ID: 123456789012345678@g.us
```

O valor completo (incluindo `@g.us`) é o `Group_Id`.

---

**4 — Cadastrar na tabela**

Inserir ou atualizar o registro em `NAGT_API_CALL_NUMBERS`:

| Coluna | Valor |
|--------|-------|
| `GROUP_ID` | `123456789012345678@g.us` |
| `TYPE` | `GERP` (ou o tipo correspondente) |
| `NROTELEFONE` | pode ficar vazio para destinatários do tipo grupo |

O parâmetro `psNroTelefone VARCHAR2` das procedures aceita tanto o `Group_Id` quanto um número individual — nenhuma alteração de assinatura é necessária.