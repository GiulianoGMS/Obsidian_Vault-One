---
Language:
  - "[[JavaScript]]"
  - "[[Node.js]]"
  - "[[ZPL]]"
Squads:
  - "[[TI]]"
System:
  - "[[ZPL]]"
  - "[[HTML]]"
Open Tags:
  - "[[Crachás]]"
  - "[[Evento]]"
  - "[[Check-in]]"
  - "[[ZPL]]"
Date: 2026-08-11
Type: Project
tags:
  - Projects
---

> [!info] Contexto
> Ferramenta interna para impressão de crachás no evento **Doce Novembro 2026** (gerenciado pela plataforma [[Eventiza]]). A Eventiza não exporta [[ZPL]] — só planilha de participantes — e a única impressora disponível é uma **Zebra**, que exige ZPL. Solução: app web local que importa o XLSX da Eventiza e envia o ZPL direto à impressora no check-in.

---

## Arquitetura

```
impressao crachas.bat   → sobe server.mjs na porta 3939 + abre navegador
index.html              → interface completa (HTML + CSS + JS, zero dependências)
server.mjs              → Node puro (sem npm); serve index.html + endpoint POST /imprimir
```

**Fluxo de impressão:**
`index.html` gera ZPL → `fetch('/imprimir')` → `server.mjs` grava arquivo temp → `copy /b origem \\host\impressora`

> Sem o servidor, o app funciona no modo fallback: baixa o `.zpl` como arquivo em vez de enviar direto.

---

## Decisões técnicas relevantes

### Parser XLSX sem biblioteca
O app lê `.xlsx` (formato da exportação Eventiza) com código **100% nativo** — sem SheetJS ou qualquer lib:
- [[XLSX]] é um ZIP → lê End Of Central Directory + Central Directory manualmente via `DataView`
- Descompressão via `DecompressionStream('deflate-raw')` ([[API]] nativa Chrome/Edge/Firefox)
- XMLs internos (`sheet1.xml`, `sharedStrings.xml`) parseados com `DOMParser` nativo

### Mapeamento de colunas configurável
A planilha [[Eventiza]] tem armadilhas: dois IDs (`Id. do pedido` × `Id. do ingresso`), dois e-mails e cabeçalhos com caracteres especiais. O app auto-detecta colunas por heurística mas expõe seletores para correção manual — sem hardcode de nomes que podem mudar entre exportações.

### `copy /b` em vez de `fs.copyFile`
`fs.copyFile` do Node (que usa `CopyFileW` do Windows) falha com `ENOENT` em caminhos de impressora compartilhada (`\\IP\nome`), mesmo o `copy /b` manual funcionando. Hipótese: `cmd.exe` tem tratamento legado para "impressoras como arquivo" que a API Win32 pura não replica. Solução: `child_process.execFile('cmd.exe', ['/d', '/c', 'copy', '/b', origem, destino])`. Caracteres perigosos (`&`, `|`, `<`, `>`, `^`, `%`) são validados antes de montar o comando.

### Cursor vertical dinâmico no ZPL
Nomes longos quebram em 2 linhas via `^FB`. Para evitar sobreposição com o campo seguinte, o gerador estima a altura do nome (largura da fonte × largura disponível) e desloca todos os elementos abaixo dinamicamente — nenhum campo tem posição vertical fixa.

---

## Check-in e registro

- Primeiro check-in: grava horário atual em `localStorage` (`crachas_checkins`) e monta o [[ZPL]]
- Reimpressão: reutiliza o **mesmo** horário gravado — evita duplicar registro
- Exportar log: botão gera `.csv` com todos os check-ins do dia
- Limpar: botão reseta o `localStorage` para novo evento/dia

> Check-in é **local ao navegador** — não há banco de dados. Trocar de máquina/navegador perde o histórico.

---

## Conteúdo do crachá (ZPL)

Nome do evento → Nome do convidado → Tipo de ingresso → Check-in (data/hora) → E-mail → QR code (ID do ingresso) → ID legível

Usa `^CI28` (UTF-8) para acentuação correta em Zebras ZD/ZT modernas.

---

## Limitações

| Limitação                            | Detalhe                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Windows + Node.js obrigatório        | `copy /b` via `cmd.exe` é Windows-específico; sem Node, só funciona no modo download  |
| Impressora precisa ser compartilhada | Necessário caminho `\\host\nome` — mesmo que compartilhada só pra ela mesma           |
| Check-in local                       | `localStorage` não sincroniza entre máquinas nem navegadores                          |
| Sem internet                         | Fonte [[Nunito]] não carrega (cai para fonte do sistema); resto funciona 100% offline |

---

## Checklist para nova máquina

- [ ] Copiar a pasta inteira do projeto (não tem `node_modules`)
- [ ] Instalar Node.js
- [ ] Compartilhar a impressora Zebra (se USB direto: `\\localhost\NomeCompartilhado`)
- [ ] Duplo clique em `impressao crachas.bat`
- [ ] Configurar o caminho da impressora na interface (salvo em `localStorage`)
