---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Recebimento]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[InfAdFisco]]"
  - "[[NFe]]"
  - "[[Tags]]"
Date:
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**: A LC 224 trouxe a necessidade da emissão do campo infAdFisco (Informação Adicional Desitnada ao Fisco) nas notas fiscais que contenham itens da LC. + [[Reforma Tributária]]

A TOTVS ofereçceu a saída documentada no [TDN](https://tdn.totvs.com/pages/releaseview.action?pageId=1058466315), no entanto ainda não havia a disponibilizade deste recurso na versão 25.07.022.

Para atender a demanda, foram criadas a [[Function]] [NAGF_OBSINFOADFISCO ](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/5e62f449194bac71dc0ae12824b2aaad7f5e3169/NAGF_OBSINFOADFISCO.fnc#L10) , sendo responsável pelo preenchimento do campo na [[Procedure]] **SP_EXPNFE_2g** oficial da TOTVS. **Por ser um objeto ofocial, após a atualização de ersão o mesmo precisa ser reaplicado.**

```sql
-- Adicionar a function na SP_EXPNFE_2g
-- Linha 772
END -- Alt Giuliano LC 224/2025
              || NAGF_OBSINFOADFISCO(A.SEQNF, A.codgeraloper)
			  as M000_DS_INFO_FISCO,
```
**Regras:**

A Function depende de três [[PD]]s: 
- **OBS_INFOADFISCO_TRIB**
Lista de Tributacoes que emitem obs na tag InfoAdFisco (Operacao esta sujeita ao disposto na Lei Complementar n 224 de 2025)
- **OBS_INFOADFISCO_CGO**
Lista de COGs de exclusao da regra da tag InfoAdFisco (Operacao esta sujeita ao disposto na Lei Complementar n 224 de 2025)
- **OBS_INFOADFISCO_DATA**
Data limite para emissao da tag InfoAdFisco LC 2242025