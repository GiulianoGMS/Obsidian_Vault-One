---
Language:
  - "[[SQL]]"
  - "[[PowerShell]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[SEFAZ]]"
  - "[[Monitoramento]]"
Date: 2026-07-10
Type: Project
---

> [!info] Referência
> Repositório: [GiulianoGMS/Status-NFE-NFCe-SEFAZ](https://github.com/GiulianoGMS/Status-NFE-NFCe-SEFAZ)  
> 
> Script de sincronização: `sync.ps1` (PowerShell — sem dependências externas além do `sqlplus`)  
> Alerta configurado em: `Parâmetros > Alertas` do ERP
>
> O `.env` **não está versionado** — o repositório contém apenas um `.env.example` com as variáveis necessárias. Copiar e preencher localmente antes de executar.

---

## Visão Geral

Monitoramento automático do status dos webservices da [[SEFAZ]] ([[NF-e]] e [[NFC-e]]). Um script [[PowerShell]] consulta uma [[API]] externa de monitoramento e persiste os dados em `ERP_INTEGRATION.NAGT_NFE_STATUS_UFS` via MERGE. O [[ERP]] avalia periodicamente um SELECT de alerta nessa tabela e dispara notificação quando há lentidão ou contingência ativa.

Alerta no ERP:

![[Pasted image 20260710164047.png]]

---

## Arquitetura

```
API externa (NFe)   ──┐
                       ├─→ sync.ps1 ──→ sqlplus MERGE ──→ NAGT_NFE_STATUS_UFS
API externa (NFC-e) ──┘                                          ↓
                                               ERP: Parâmetros > Alertas
                                               └── SELECT do alerta (a cada ciclo)
                                                         ↓ (se COUNT > 0)
                                               gep_atualizacaoalertas (job ERP)
                                                         ↓
                                               Alerta dispara no painel
```

---

## Tabela `NAGT_NFE_STATUS_UFS`

Schema: `ERP_INTEGRATION`

```sql
CREATE TABLE NAGT_NFE_STATUS_UFS (
  TIPO            VARCHAR2(10),    -- 'NFE' ou 'NFCE'
  ID              NUMBER,          -- ID do estado na API
  SIGLA           VARCHAR2(2),     -- ex: 'SP', 'RJ'
  NOME_ESTADO     VARCHAR2(100),
  TEMPO_RESPOSTA  NUMBER,          -- tempo em minutos
  SVC             VARCHAR2(10),    -- 'Sim' = em contingência
  NORMAL          NUMBER(1),       -- 1 = operação normal
  ATUALIZADO_EM   DATE DEFAULT SYSDATE
)
TABLESPACE USERS;
```

> **Chave de unicidade no MERGE:** `(ID, TIPO)` — o mesmo estado tem uma linha para NFe e outra para NFC-e.

---
## Script de Sincronização (`sync.ps1`)

O script PowerShell é a versão ativa em produção. Não requer instalação de drivers — usa apenas `sqlplus.exe` disponível no servidor.

## Agendamento — Task Scheduler (Windows)

O `sync.ps1` é executado periodicamente via **Agendador de Tarefas do Windows** no servidor.

**Configuração da tarefa:**

| Campo           | Valor                                          |
| --------------- | ---------------------------------------------- |
| Programa/script | `powershell.exe`                               |
| Argumentos      | `-ExecutionPolicy Bypass -File "...\sync.ps1"` |
| Iniciar em      | diretório raiz do projeto (onde está o `.env`) |

> [!tip] Por que `-ExecutionPolicy Bypass`?
> O PowerShell bloqueia scripts não assinados por padrão. O flag permite executar o `sync.ps1` sem alterar a política global do servidor.

O campo **"Iniciar em"** é importante: o script localiza o `.env` relativo ao próprio diretório (`$MyInvocation.MyCommand.Path`), então a pasta de trabalho deve ser a raiz do projeto.

---
### Configuração (`.env`)

Arquivo `.env` no mesmo diretório do script:

```
ORACLE_USER=USUARIO
ORACLE_PASSWORD=SENHA
ORACLE_CONNECT_STRING=HOST:PORTA/SERVICE   # ou alias TNS
TNS_ADMIN=C:\oracle\network\admin          # opcional, se usar alias TNS

API_URL=https://...      # endpoint do monitor NFe
API_URL_NFCE=https://... # endpoint do monitor NFC-e
```
## APIs:

- API_URL="http://monitor.zorte.com.br/api/status/nfe"
- API_URL_NFCE="http://monitor.zorte.com.br/api/status/nfce"

### Filtro de UFs

A API retorna todos os estados do Brasil. O script filtra apenas **SP e RJ** antes do MERGE.

Para adicionar ou remover UFs, editar diretamente no `sync.ps1`:

```powershell
$rows = $rows | Where-Object { $_.sigla -in @("SP", "RJ") }
```

> Não é configurável pelo `.env` — alterar o array no próprio script.

### Formato da API

A API retorna um **objeto** com sigla como chave (não um array):

```json
{ "SP": { "id": 35, "sigla": "SP", "tempo_resposta": 2, "svc": "Não", "normal": 1, ... },
  "RJ": { ... } }
```

O script converte via `$response.PSObject.Properties.Value` para tratar como lista.

### MERGE na tabela

Para cada linha (SP e RJ × NFe e NFC-e = até 4 registros):

```sql
MERGE INTO NAGT_NFE_STATUS_UFS tgt
USING (SELECT 'NFE' AS TIPO, 35 AS ID, 'SP' AS SIGLA, ... FROM dual) src
ON (tgt.ID = src.ID AND tgt.TIPO = src.TIPO)
WHEN MATCHED THEN UPDATE SET
  tgt.TEMPO_RESPOSTA = src.TEMPO_RESPOSTA,
  tgt.SVC = src.SVC,
  tgt.NORMAL = src.NORMAL,
  tgt.ATUALIZADO_EM = SYSDATE
WHEN NOT MATCHED THEN INSERT (...) VALUES (...);
```

O script gera um arquivo `.sql` temporário em `%TEMP%`, executa via `sqlplus -S /nolog @arquivo.sql` e remove o arquivo ao final.

> [!note] Acentuação
> O script remove diacríticos (`Remove-Diacritics`) de `NOME_ESTADO` e `SVC` antes de inserir, para evitar problemas de encoding com o sqlplus.

---

## Alerta no ERP

Configurado em **Parâmetros > Alertas**.

![[Pasted image 20260710170838.png]]

```sql
SELECT COUNT(1) A
  FROM ERP_INTEGRATION.NAGT_NFE_STATUS_UFS X
 WHERE (
          TIPO = 'NFE'
      AND TEMPO_RESPOSTA > 5           -- resposta acima de 5 minutos
      AND ATUALIZADO_EM >= SYSDATE - (25/1440)  -- sincronizado nos últimos 25 min
       )
    OR SVC = 'Sim'                     -- em contingência (qualquer tipo/UF)

HAVING COUNT(1) > 0
```

**Lógica de disparo:**

| Condição | Significado |
|----------|-------------|
| `TEMPO_RESPOSTA > 5` | Webservice lento (> 5 minutos de resposta) |
| `SVC = 'Sim'` | SEFAZ em contingência ativa |
| `ATUALIZADO_EM >= SYSDATE - 25/1440` | Registro recente — confirma que o sync está rodando |

> [!warning] Guard de 25 minutos
> A condição `ATUALIZADO_EM >= SYSDATE - 25/1440` protege contra **falsos positivos por sync parado**: se o script parar de rodar, os registros ficam com `ATUALIZADO_EM` antigo e a condição NFe não dispara mais. Isso significa que uma falha no sync silencia o alerta — monitorar a execução do job do script também é importante.

---

## Job / Procedure ERP

A procedure `gep_atualizacaoalertas` deve ser configurada em um **job do ERP** para avaliar periodicamente os alertas e atualizar o status no painel, consumindo o SELECT acima.

O intervalo de execução do job determina a latência entre uma mudança no status SEFAZ e a notificação aparecer no painel.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `ERP_INTEGRATION.NAGT_NFE_STATUS_UFS` | Tabela | Status dos webservices SEFAZ por UF e tipo (NFe/NFC-e) |
| `gep_atualizacaoalertas` | Procedure (ERP) | Reavalia e atualiza alertas configurados em Parâmetros > Alertas |
