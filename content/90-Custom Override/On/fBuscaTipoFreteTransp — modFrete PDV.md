---
Language:
  - "[[SQL]]"
Repository:
  - "[[Official_Ora_Obj_Changes]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NF-e]]"
  - "[[modFrete]]"
  - "[[PDV]]"
Date: 2026-06-22
Type:
GLPI: 724098
---

> [!info] Referência
> Repositório: [GiulianoGMS/Official_Ora_Obj_Changes — fBuscaTipoFreteTransp.fnc](https://github.com/GiulianoGMS/Official_Ora_Obj_Changes/blob/main/fBuscaTipoFreteTransp.fnc)
> GLPI: **724098**

---

## Visão Geral

Customização na função `fBuscaTipoFreteTransp`, responsável por determinar o `modFrete` gravado na NF-e de saída. O problema reportado no **GLPI 724098** era que vendas originadas no **PDV** saíam com `modFrete = 9` (Sem Ocorrência de Transporte) quando o correto seria `4` (Transporte Próprio por conta do Destinatário).

A correção adiciona uma verificação de origem da nota (`APPORIGEM = 7` → PDV) e retorna o valor configurado no parâmetro dinâmico `PDV_INDTRANSPORTE` em vez do `9` fixo.

---

## Problema

Notas fiscais emitidas pelo PDV (`APPORIGEM = 7`) chegavam no `else` final da função — cenário para `psTipoFrete` nulo ou não mapeado — e recebiam `modFrete = 9` incondicionalmente.

O correto para entregas com trnsporte próprio oriundas do PDV é `modFrete = 4` (Transporte Próprio por conta do Destinatário).

---

## Alterações realizadas

### 1 — Novo parâmetro dinâmico buscado

```sql
-- Antes
select fc5maxparametro('EXPORT_NFE', pnNroEmpresa, 'EMITE_TRANSPORTADOR_CIF'),
       fc5maxparametro('EXPORT_NFE', pnNroEmpresa, 'GERA_FRETE_TIPO_ENTREGA_PED')
into   vsEMITE_TRANSPOR_CIF,
       vsGeraFreteTipoEntrega
from   dual;

-- Depois
select fc5maxparametro('EXPORT_NFE', pnNroEmpresa, 'EMITE_TRANSPORTADOR_CIF'),
       fc5maxparametro('EXPORT_NFE', pnNroEmpresa, 'GERA_FRETE_TIPO_ENTREGA_PED'),
       fc5maxparametro('NAGUMO', 0, 'PDV_INDTRANSPORTE')
into   vsEMITE_TRANSPOR_CIF,
       vsGeraFreteTipoEntrega,
       vsIndTranspPDV
from   dual;
```

### 2 — APPORIGEM buscado junto com TIPENTREGA

```sql
-- Antes
select nvl(MAX(A.TIPENTREGA),'E')
into   vsTipEntrega

-- Depois
select nvl(MAX(A.TIPENTREGA),'E'), MAX(B.APPORIGEM)
into   vsTipEntrega, vsAppOrigem
```

### 3 — Bloco `else` final ajustado

```sql
-- Antes
else
  vsRet := 9;

-- Depois
else
  -- Giuliano 22/06
  IF vsAppOrigem = 7 THEN
       vsRet := vsIndTranspPDV;
  ELSE vsRet := 9;
  END IF;
```

---

## Lógica completa da função (pós-alteração)

A função retorna o `modFrete` seguindo esta ordem de prioridade:

| Prioridade | Condição | Retorno | Significado |
|------------|----------|---------|-------------|
| 1 | `GERA_FRETE_TIPO_ENTREGA_PED = 'S'` + carga + entrega `'E'` | `0` | CIF |
| 2 | `GERA_FRETE_TIPO_ENTREGA_PED = 'S'` + carga + entrega `'R'` | `1` | FOB |
| 3 | `psTipoFrete = 'C'` + `EMITE_TRANSPORTADOR_CIF = 'S'` + transportador | `0` | CIF |
| 4 | `psTipoFrete = 'C'` | `0` | CIF |
| 4 | `psTipoFrete = 'F'` | `1` | FOB |
| 4 | `psTipoFrete = 'T'` | `2` | Terceiros |
| 4 | `psTipoFrete = 'R'` | `3` | Próprio Remetente |
| 4 | `psTipoFrete = 'D'` | `4` | Próprio Destinatário |
| 5 *(novo)* | `psTipoFrete` nulo/outro + `APPORIGEM = 7` (PDV) | `PDV_INDTRANSPORTE` | Configurável por PD |
| 5 | `psTipoFrete` nulo/outro + outra origem | `9` | Sem ocorrência |

**Tabela modFrete (NF-e):**

| Código | Descrição |
|--------|-----------|
| `0` | Contratação do Frete por conta do Remetente (CIF) |
| `1` | Contratação do Frete por conta do Destinatário (FOB) |
| `2` | Contratação do Frete por conta de Terceiros |
| `3` | Transporte Próprio por conta do Remetente |
| `4` | Transporte Próprio por conta do Destinatário |
| `9` | Sem ocorrência de transporte |

---

## Parâmetro Dinâmico

| PD | Empresa | Descrição |
|----|---------|-----------|
| `PDV_INDTRANSPORTE` | NAGUMO / 0 | Código `modFrete` a ser usado em NF-e de vendas com origem PDV (`APPORIGEM = 7`). Valor esperado: `4` |

---

## Variáveis adicionadas

| Variável | Tipo | Origem |
|----------|------|--------|
| `vsAppOrigem` | `MFL_DOCTOFISCAL.APPORIGEM%TYPE` | `MAX(B.APPORIGEM)` no SELECT da carga |
| `vsIndTranspPDV` | `max_parametro.valor%type` | PD `PDV_INDTRANSPORTE` |

---

## Objetos de Banco Utilizados

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `MFL_DOCTOFISCAL` | Tabela | Documento fiscal — fonte de `APPORIGEM` e `NROCARGA` |
| `MRL_CARGAEXPED` | Tabela | Carga de expedição — `TIPENTREGA` |
| `MAD_TRANSPORTADOR` | Tabela | Transportador — `INDTIPOTRANSPORTADOR` |
| `fc5maxparametro` | Função | Leitura de parâmetros dinâmicos |

---

## Notas

> [!tip] APPORIGEM = 7 → PDV
> O valor `7` em `APPORIGEM` identifica notas geradas pelo PDV TOTVS. Outras origens (e-commerce, ERP, etc.) continuam com `modFrete = 9` quando o tipo de frete não é mapeado.

> [!warning] Configurar PD antes de ativar
> O valor retornado para PDV depende do parâmetro `PDV_INDTRANSPORTE`. Garantir que está configurado como `4` em produção antes de aplicar o objeto.
