---
Language:
  - "[[SQL]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[TOTVS Varejo]]"
Open Tags:
  - "[[DevTools]]"
  - "[[REST API]]"
  - "[[Investigação]]"
Date: 2026-07-02
Type: Ferramenta
---

## Objetivo

Descobrir qual API é chamada por uma tela Web da TOTVS Varejo e localizar a consulta SQL (View/Procedure) utilizada pelo backend.

---

## Fluxo Geral

```
Tela Web TOTVS
      ↓
F12 → Network (Fetch/XHR)
      ↓
Endpoint REST identificado
      ↓
Response JSON analisado
      ↓
Monitorar V$SQL no Oracle durante a chamada
      ↓
View / Procedure encontrada
      ↓
Regra de negócio
```

---

## Passo a Passo

### 1. Abrir o DevTools

Pressionar `F12` → aba **Network**.

Configurações recomendadas:
- **Preserve log** ✔ — mantém as requisições ao navegar
- **Disable cache** — opcional, garante chamadas reais
- **Filtro:** `Fetch/XHR` — mostra apenas chamadas REST

Limpar as requisições existentes (ícone de lixeira) antes de executar a ação.

---

### 2. Executar a ação na tela

Clicar no botão/card desejado. Todas as chamadas REST disparadas pela tela aparecerão na lista.

---

### 3. Identificar o endpoint

Na lista de requisições, localizar a chamada correspondente à ação. Exemplo:

```http
GET /ConfiguradorCenariosTribitariosAPI/api/v1/cenarios/correspondencia
    ?page=1
    &pageSize=100
    &order=idCenario
    &semCorrespondencia=true
```

Para ver os parâmetros completos, selecionar a requisição e acessar as abas:
- **Headers** — cabeçalhos e URL completa
- **Payload** — body da requisição (POST/PUT)

---

### 4. Analisar o Response

Aba **Response** ou **Preview** — ver o JSON retornado. O conteúdo revela quais dados o backend está retornando e ajuda a inferir a regra.

**Exemplo:** campos `null` indicando ausência de configuração:
```json
{
  "items": [{ "idCenario": 3, "codTribCst": null, "codTribCclassTrib": null }]
}
```

---

### 5. Localizar o SQL Oracle

Com o endpoint conhecido, monitorar o Oracle **enquanto a requisição é executada**. Executar a ação na tela e, em paralelo, consultar:

```sql
-- Sessões ativas
SELECT * FROM V$SESSION;

-- SQLs executados recentemente (ordenar pelo mais recente)
SELECT sql_id, sql_text
  FROM V$SQL
 ORDER BY last_active_time DESC;
```

Localizar o SQL cuja `last_active_time` coincide com o momento da chamada. A partir do `sql_text` é possível identificar a View ou Procedure responsável.

Ou melhor, buscar conteudo relacionado que foi executado SQL recentemente, exeplo:

```sql
SELECT owner,
       object_name,
       object_type
FROM all_objects
WHERE upper(object_name) LIKE '%CORRESPOND%';
```

---

## Caso Prático

**Tela:** `Fiscal → Configurador de Cenários Tributários → Cadastro de Cenários Tributários`

**Situação:** ao clicar no card **Divergência CBS/IBS**, era retornado apenas o cenário 3 — a regra era desconhecida.

| Passo | Achado |
|-------|--------|
| Network | `GET /ConfiguradorCenariosTribitariosAPI/api/v1/cenarios/correspondencia?semCorrespondencia=true` |
| Response | `idCenario: 3` com `codTribCst: null` — cenário sem correspondência cadastrada |
| V$SQL | SQL executado identificado → View responsável localizada |
| Regra | Cenários sem correspondência tributária cadastrada são listados como divergentes |

---

## Dicas

> [!tip] Preserve Log
> Sempre ativar **Preserve log** antes de navegar — sem ele, as requisições da página anterior são perdidas ao carregar uma nova rota SPA.

> [!tip] Filtrar por nome
> No campo de busca do Network, digitar parte do endpoint (ex: `cenarios`) para filtrar rapidamente entre dezenas de chamadas.

> [!tip] Correlacionar horário
> Anotar o horário exato do clique e usar `WHERE last_active_time > SYSDATE - 1/1440` no `V$SQL` para restringir os resultados ao último minuto.
