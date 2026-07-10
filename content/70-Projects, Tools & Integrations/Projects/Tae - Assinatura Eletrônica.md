---
title: TAE - Assinatura Eletrônica
tags:
  - projeto
  - TAE
  - acordos
  - email
Language:
  - "[[SQL]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
  - "[[PLSQL-Oracle]]"
---

# TAE - Assinatura Eletrônica

Desenvolvimento de alertas para monitoramento de status de Acordos ou Documentos enviados através do [[Tae]].

## Objetos Base

- **View de acompanhamento:** [NAGV_TAE_ACORDOS_V4](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/66feb5d8873fb54ea25ad7255bc552845af6a5c1/NAGV_TAE_ACORDOS_V4.sql) — também alimenta o [[BI]].
- **Log de e-mails enviados:** `NAGT_LOG_ENVIO_ACO_EMAIL`

## Alertas dentro do ERP

View: [NAGV_TAE_USU_MSG](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/66feb5d8873fb54ea25ad7255bc552845af6a5c1/NAGV_TAE_USU_MSG.sql)

Configuração: Em [[Parâmetros]] > Alertas, criar o alerta informando módulo × usuário que irá receber o aviso. Inserir o Select do Git na configuração SQL do alerta.

## E-mail para Compradores

Alerta de Acordos Pendentes de Assinatura/Rejeitados no [[Tae]] por [[E-mail]] para o respectivo [[Comprador]]:

- [[Procedure]]: [NAGP_ENVIO_ACORDO_PENDENTE_EMAIL](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/66feb5d8873fb54ea25ad7255bc552845af6a5c1/NAGP_ENVIO_ACORDO_PENDENTE_EMAIL.prc)
- Enviado diariamente às **15:00h** em dias úteis pelo Job `NAGJ_TAE_ALERTA_EMAIL`
- Agrupamento por Comprador
- A URL do botão do TAE é formada pela [[Function]] [fUrlTAE](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/58a349b73302fa9cf7f72c9b377b4d6de2064f10/fUrlTAE.fnc)

![[TAE - Email Compradores.png]]

## E-mail para Fornecedores

Alerta de [[Acordos]] Pendentes de Assinatura/Rejeitados no [[Tae]] por [[E-mail]] para o respectivo [[Fornecedor]]:

- [[Procedure]]: [NAGP_ENVIO_ACORDO_PEND_FORNEC_EMAIL](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_ENVIO_ACORDO_PEND_FORNEC_EMAIL.prc)
- Enviado diariamente às **15:00h** em dias úteis pelo Job `NAGJ_TAE_ALERTA_EMAIL`
- O agrupamento é feito por [[Representante]] associado aos acordos (não por fornecedor)
- Cada representante vê apenas seus respectivos acordos pendentes, com a coluna "Comprador" para referência

![[TAE - Email Fornecedor.png]]

## Script do Job NAGJ_TAE_ALERTA_EMAIL

```sql
DECLARE 
 vErro VARCHAR2(4000);
BEGIN
       FOR T IN (SELECT DISTINCT SEQCOMPRADOR
                   FROM MAX_COMPRADOR X
                  WHERE 1=1)
       LOOP
              BEGIN
                     NAGP_ENVIO_ACORDO_PENDENTE_EMAIL(T.SEQCOMPRADOR, 'S');
              END;
       END LOOP;

-- Envia aos fornecedores
  FOR email IN (SELECT DISTINCT EMAIL FROM NAGV_TAE_ACORDOS_V4 X 
                 WHERE 1=1 
                   AND X.STATUS IN ('Aguardando assinatura do envelope','Pendente'))
    LOOP
      BEGIN
         NAGP_ENVIO_ACORDO_PEND_FORNEC_EMAIL(email.EMAIL, 'N');
      EXCEPTION
         WHEN OTHERS THEN
           vErro := SQLERRM;
            INSERT INTO NAGT_LOG_ENVIO_ACO_EMAIL (
                NRO_ACORDO, COD_COMPRADOR, EMAIL_DESTINO,
                QTDE_ACORDOS, HTML_EMAIL, DATA_ENVIO
            ) VALUES (
                0, 0, email.EMAIL, NULL,
                'ERRO FORNECEDOR: ' || vErro, SYSDATE
            );
            COMMIT;
      END;
   END LOOP;
   COMMIT;
END;
```

## Inconsistência no Recebimento de NFe

[[Inconsistencia Recebimento NFe]] — Geradas inconsistências no Recebimento de [[NFe]]. Passa a ser consistido o status do documento do TAE vinculado ao pedido atrelado ao item no recebimento. O único status a não criticar é **"Envelope Finalizado"** (Assinado).

- Sell-in: [Script no Git](https://github.com/GiulianoGMS/DQL-Oracle/blob/7af78ff5e21eb16f6726c6281ccba9c2343a767b/Com_Incons%20TAE.sql)
- Sell-out: Pendente
