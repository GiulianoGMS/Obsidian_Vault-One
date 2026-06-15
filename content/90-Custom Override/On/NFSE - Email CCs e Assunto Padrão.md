---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Recebimento]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFSe]]"
  - "[[Nota Fiscal de Serviço Eletronica]]"
  - "[[Serviço]]"
Date: 2026-01-30
Type: "[[Procedure]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: false
---
O ERP é responsável por montar o documento/arquivo de **Notas Fiscais de Serviço (NFSe)** para envio à [[NDD]]. A emissão é realizada pelo data center do parceiro.

A [[Procedure]] **Sp_GeraArqEnvioNDDigitalNFSe** é responsável por montar este arquivo. Foi necessário adaptação dos dados padrões de envio para que o arquivo RPS seja enviado ao parceiro [[Itworks]], além do envio ao fornecedor mesmo quando o e-mail não fosse preenchido manualmente pelo usuário emissor.

Desta forma, foram realizados os seguintes ajustes neste objeto:

- **Linhas 273 à 277**
```sql
COALESCE(a.emaildestnfse, j.EMAILNFE, C.EMAILNFE, 'nfe1@ .com.br') emaildestnfse, 
            'nfe1@ .com.br' emailcopianfse, 
            'Nota Fiscal de Serviço Eletrônica – NFSe n '||a.NUMERONF assuntoemailnfse, 
            'Prezados(as), Segue em anexo a Nota Fiscal de Serviço Eletrônica (NFSe) referente aos serviços prestados. Este é um e-mail automático. Favor não responder.' corpoemailnfse,
```
Por se tratar de um objeto oficial da TOTVS, é necessário que após cada atualização de [[versão]], os ajustes sejam reaplicados na procedure, mantendo assim a regra de envio definida pelo time [[Fiscal]].