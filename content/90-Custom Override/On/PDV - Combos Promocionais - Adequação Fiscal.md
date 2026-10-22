---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[30-Squad/Fiscal]]"
  - "[[Pricing]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Combos Promocionais]]"
Date:
Type: "[[Package]]"
Project:
tags:
  - reapply
  - custom_override
Aplicado 26..017: true
---
**Necessidade**: Reportado pelo time [[Fiscal]] que os XMLs de vendas que continham produtos em dinãmicas de [[Combos Promocionais]] (**Leve Pague/Leve xx Ganhe yy**) estavam gerando desconto no item final da compra, permitindo que o item saia à R$ 0,01 e consequentemente o imposto seja calculado com base neste valor.

**Ajuste:** Foi identificado que a mesma dinâmica quando era criada à partir do Monitor, gerava o desconto encima do combo inteiro e não apenas de um item. A diferença fazia com que a base de impostos  não fosse mais apenas R$ 0,01.

Para que o [[ERP]] desça as informações para o [[PDV]] da mesma forma do [[MonitorPDV]], foram ralizadas dois ajustes nas views: **MON_COMBO** e **MON_COMBOITEM**:

##### **MON_COMBO:**

```sql
CREATE OR REPLACE VIEW MON_COMBO AS
select seqpromocpdv seqcombo,
       descricao combo,
       dtainicio,
       dtafim,
       decode(status, 'A', 'S', 'N') ativo,
       nrobaseexportacao,
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN 2 ELSE 1 END TIPO,
       -- Se for leve pague
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN
             -- Se o percentual for menor que 90, retorna nulo, caos contrario retorna vlrdesc
             (SELECT CASE WHEN MAX(XI.PERCDESCONTO) < 90 THEN NULL ELSE
                     ROUND(MAX(PRECOVALIDNORMAL) * (MAX(XI.PERCDESCONTO)/100),2) - 0.01 END
                FROM MRL_PRODEMPSEG S INNER JOIN MFL_PROMOCPDVEMP E ON E.NROEMPRESA = S.NROEMPRESA
                                      INNER JOIN MAX_EMPRESA M ON M.NROEMPRESA = S.NROEMPRESA AND S.NROSEGMENTO = M.NROSEGMENTOPRINC
                                      INNER JOIN MFL_PROMOCPDVITEM XI ON XI.SEQPROMOCPDV = A.SEQPROMOCPDV AND XI.SEQPRODUTO = S.SEQPRODUTO
               WHERE E.SEQPROMOCPDV = A.SEQPROMOCPDV AND S.QTDEMBALAGEM = 1 AND PRECOVALIDNORMAL > 0 AND XI.PERCDESCONTO > 90) ELSE NULL END vlrdesconto,
       NULL PERCDESCONTO,
       null preco
  from mfl_promocaopdv A
 where indtipoqtdcargapdv in ('M', 'L')

```
##### **MON_COMBOITEM:**

```sql
create or replace view mon_comboitem as
select a.seqpromocpdv seqcombo,
       a.seqitempromoc seqitem,
       decode(a.promocporfamilia, 'S', a.seqfamilia, null) seqfamilia,
       decode(a.promocporfamilia, 'S', null, a.seqproduto) seqproduto,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 'N' ELSE a.tipoitempromoc END tipoitem,
       a.quantidade qtde,
       a.qtdembalagem,
       a.precoitem preco,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 0 ELSE a.percdesconto END PERDESCONTO,
       a.seqproduto seqprodutobase,
       cast(decode(a.seqgrupo, 0, null, a.seqgrupo) as number(3)) seqgrupo,
       decode(a.status, 'A', 'S', 'N') ativo,
       a.nrobaseexportacao,
       null vlrdesconto,
       null seqcategoria,
       null nrodivisao
  from mfl_promocpdvitem a INNER JOIN MFL_PROMOCAOPDV B ON B.SEQPROMOCPDV = A.SEQPROMOCPDV

```

---

## Monitoramento automático do Override (Job)

> A cada atualização do PDV/ERP, essas views podem ser sobrescritas de volta para a versão padrão. Para evitar verificação manual, foi criada uma rotina que **detecta** se a view no banco ainda é a versão customizada e, caso tenha voltado para o padrão, **reaplica** automaticamente o `CREATE OR REPLACE`.

**Como funciona a detecção:** a procedure lê o DDL atual de cada view (`DBMS_METADATA.GET_DDL`) e procura por um "marcador" que só existe na versão custom:
- `MON_COMBO` → trecho `- 0.01` / `INDTIPOQTDCARGAPDV`
- `MON_COMBOITEM` → trecho `INDTIPOQTDCARGAPDV = 'L'`

Se o marcador não estiver presente, significa que a view voltou para a versão padrão → reaplica e registra no log.

### 1. Tabela de log (cria uma vez)

```sql
CREATE TABLE NAGT_LOG_OVERRIDE_COMBO (
  dthr       DATE          DEFAULT SYSDATE,
  view_name  VARCHAR2(30),
  situacao   VARCHAR2(60),
  detalhe    VARCHAR2(200)
);
```

### 2. Procedure de verificação e reaplicação

```sql
CREATE OR REPLACE PROCEDURE NAGP_REAPLICA_CUST_COMBO_PDV IS
  v_ddl    CLOB;
  v_custom BOOLEAN;
  v_erro VARCHAR2(4000);
BEGIN
  -- MON_COMBO
  v_ddl    := DBMS_METADATA.GET_DDL('VIEW', 'MON_COMBO');
  v_custom := (DBMS_LOB.INSTR(v_ddl, '- 0.01') > 0
               OR DBMS_LOB.INSTR(v_ddl, 'INDTIPOQTDCARGAPDV') > 0);

  IF v_custom THEN
    INSERT INTO NAGT_LOG_OVERRIDE_COMBO(view_name, situacao, detalhe)
    VALUES ('MON_COMBO', 'CUSTOM OK', 'Nenhuma acao necessaria');
  ELSE
    EXECUTE IMMEDIATE q'[
CREATE OR REPLACE VIEW MON_COMBO AS
select seqpromocpdv seqcombo,
       descricao combo,
       dtainicio,
       dtafim,
       decode(status, 'A', 'S', 'N') ativo,
       nrobaseexportacao,
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN 2 ELSE 1 END TIPO,
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN
             (SELECT CASE WHEN MAX(XI.PERCDESCONTO) < 90 THEN NULL ELSE
                     ROUND(MAX(PRECOVALIDNORMAL) * (MAX(XI.PERCDESCONTO)/100),2) - 0.01 END
                FROM MRL_PRODEMPSEG S INNER JOIN MFL_PROMOCPDVEMP E ON E.NROEMPRESA = S.NROEMPRESA
                                      INNER JOIN MAX_EMPRESA M ON M.NROEMPRESA = S.NROEMPRESA AND S.NROSEGMENTO = M.NROSEGMENTOPRINC
                                      INNER JOIN MFL_PROMOCPDVITEM XI ON XI.SEQPROMOCPDV = A.SEQPROMOCPDV AND XI.SEQPRODUTO = S.SEQPRODUTO
               WHERE E.SEQPROMOCPDV = A.SEQPROMOCPDV AND S.QTDEMBALAGEM = 1 AND PRECOVALIDNORMAL > 0 AND XI.PERCDESCONTO > 90) ELSE NULL END vlrdesconto,
       NULL PERCDESCONTO,
       null preco
  from mfl_promocaopdv A
 where indtipoqtdcargapdv in ('M', 'L')
]';
    INSERT INTO NAGT_LOG_OVERRIDE_COMBO(view_name, situacao, detalhe)
    VALUES ('MON_COMBO', 'VOLTOU PADRAO - REAPLICADO', 'CREATE OR REPLACE executado');
  END IF;

  -- MON_COMBOITEM
  v_ddl    := DBMS_METADATA.GET_DDL('VIEW', 'MON_COMBOITEM');
  v_custom := (DBMS_LOB.INSTR(v_ddl, 'INDTIPOQTDCARGAPDV = ''L''') > 0);

  IF v_custom THEN
    INSERT INTO NAGT_LOG_OVERRIDE_COMBO(view_name, situacao, detalhe)
    VALUES ('MON_COMBOITEM', 'CUSTOM OK', 'Nenhuma acao necessaria');
  ELSE
    EXECUTE IMMEDIATE q'[
create or replace view mon_comboitem as
select a.seqpromocpdv seqcombo,
       a.seqitempromoc seqitem,
       decode(a.promocporfamilia, 'S', a.seqfamilia, null) seqfamilia,
       decode(a.promocporfamilia, 'S', null, a.seqproduto) seqproduto,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 'N' ELSE a.tipoitempromoc END tipoitem,
       a.quantidade qtde,
       a.qtdembalagem,
       a.precoitem preco,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 0 ELSE a.percdesconto END PERDESCONTO,
       a.seqproduto seqprodutobase,
       cast(decode(a.seqgrupo, 0, null, a.seqgrupo) as number(3)) seqgrupo,
       decode(a.status, 'A', 'S', 'N') ativo,
       a.nrobaseexportacao,
       null vlrdesconto,
       null seqcategoria,
       null nrodivisao
  from mfl_promocpdvitem a INNER JOIN MFL_PROMOCAOPDV B ON B.SEQPROMOCPDV = A.SEQPROMOCPDV
]';
    INSERT INTO NAGT_LOG_OVERRIDE_COMBO(view_name, situacao, detalhe)
    VALUES ('MON_COMBOITEM', 'VOLTOU PADRAO - REAPLICADO', 'CREATE OR REPLACE executado');
  END IF;

  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    v_erro := SQLERRM;
    INSERT INTO NAGT_LOG_OVERRIDE_COMBO(view_name, situacao, detalhe)
    VALUES ('ERRO', 'FALHA', SUBSTR(v_erro,1,200));
    COMMIT;
    RAISE;
END;;

```

### 3. Criação do Job (DBMS_SCHEDULER)

```sql
BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name        => 'NAGJ_CHECK_OVERRIDE_COMBO',
    job_type        => 'STORED_PROCEDURE',
    job_action      => 'NAGP_REAPLICA_CUST_COMBO_PDV',
    repeat_interval => 'FREQ=DAILY; BYHOUR=6; BYMINUTE=0',
    enabled         => TRUE,
    comments        => 'Verifica e reaplica override MON_COMBO / MON_COMBOITEM'
  );
END;

```

### 4. Comandos úteis

```sql
-- Executar a verificação manualmente (ex.: logo após um update do PDV)
BEGIN NAGP_REAPLICA_CUST_COMBO_PDV; END;
/

-- Consultar o log
SELECT * FROM NAGT_LOG_OVERRIDE_COMBO ORDER BY dthr DESC;

-- Rodar o job sob demanda
BEGIN DBMS_SCHEDULER.RUN_JOB('NAGP_REAPLICA_CUST_COMBO_PDV'); END;
/

-- Verificar histórico de execuções do job
SELECT log_date, status, additional_info
  FROM user_scheduler_job_run_details
 WHERE job_name = 'NAGP_REAPLICA_CUST_COMBO_PDV'
 ORDER BY log_date DESC;

-- Desabilitar / habilitar / remover o job
BEGIN DBMS_SCHEDULER.DISABLE('NAGP_REAPLICA_CUST_COMBO_PDV'); END;
/
BEGIN DBMS_SCHEDULER.ENABLE('NAGP_REAPLICA_CUST_COMBO_PDV'); END;
/
BEGIN DBMS_SCHEDULER.DROP_JOB('NAGP_REAPLICA_CUST_COMBO_PDV'); END;
/
```

### Pontos de atenção

- **Marcadores:** se futuramente a versão padrão passar a conter os trechos usados como marcador, trocar por outro trecho exclusivo da versão custom.
- **Privilégios:** o schema que executa a procedure precisa de `CREATE VIEW` (e `CREATE JOB` para agendar).
- **Manter o DDL atualizado:** sempre que o texto oficial das views for alterado, atualizar também o `EXECUTE IMMEDIATE` dentro da procedure.

---

## 💡 Curiosidade: o que é `q'[ ... ]'`?

O `q'[ ... ]'` usado dentro do `EXECUTE IMMEDIATE` é o **alternative quoting mechanism** (ou *q-quote*) do Oracle. Ele permite escrever strings que contêm **aspas simples** sem precisar dobrá-las.

**O problema que resolve:** em SQL/PL-SQL uma string fica entre aspas simples `'...'`. Como o DDL das views tem várias aspas internas (ex.: `decode(status, 'A', 'S', 'N')`), sem o q-quote seria necessário **dobrar cada aspa** (`''A''`), deixando o código ilegível.

**Sintaxe:**

```
q'<delimitador>  ...texto literal...  <delimitador>'
```

- `q'[` → **abre** a string
- `]'` → **fecha** a string
- Tudo no meio é tratado **literalmente** — as aspas simples internas não precisam ser dobradas.

**Comparação:**

```sql
-- SEM q-quote: toda aspa precisa ser dobrada
EXECUTE IMMEDIATE 'select decode(status, ''A'', ''S'', ''N'') ativo ...';

-- COM q-quote: aspas normais, muito mais legível
EXECUTE IMMEDIATE q'[select decode(status, 'A', 'S', 'N') ativo ...]';
```

**Delimitadores possíveis** (a única regra é que o delimitador não pode aparecer dentro do texto):

| Abre  | Fecha |
| ----- | ----- |
| `q'[` | `]'`  |
| `q'{` | `}'`  |
| `q'(` | `)'`  |
| `q'<` | `>'`  |
| `q'!` | `!'`  |

> No nosso caso usamos `q'[ ... ]'` porque o DDL das views não contém o caractere `]`, então o fechamento nunca é acionado por engano.
