---
title: Vault One — Central de Documentação
---

> [!info] **Vault One** · Central de Documentação Técnica
> Base de conhecimento de desenvolvimento, automações e integrações do ERP **Consinco / PDV TOTVS**.
> Documentação viva de rotinas Oracle, triggers, relatórios e ferramentas de apoio operacional — mantida por **Giuliano .**
>
> 🔗 Repositórios e objetos em **[GitHub → GiulianoGMS](https://github.com/GiulianoGMS)**

---

## 🧭 Por onde começar

> [!tip]+ Escolha seu ponto de entrada
> | | | |
> |:-:|:-:|:-:|
> | 🚀 **[Projetos](#-projetos)** | 🔌 **[Integrações](#-integrações)** | 🛠️ **[Ferramentas](#-ferramentas)** |
> | Automações e rotinas do ERP | Exportação para parceiros externos | Utilitários e procedimentos |
> | 📊 **[GLPI Analytics](#-glpi--analytics-de-helpdesk)** | 🏷️ **[Por Área de Negócio](#-índice-por-área-de-negócio)** | 📁 **[Estrutura do Vault](#-estrutura-do-vault)** |
> | Dashboards de helpdesk | Navegação temática cruzada | Mapa de diretórios |

---

## 🚀 Projetos

> Rotinas, automações e desenvolvimentos internos sobre o ERP.
> 📁 `70-Projects, Tools & Integrations / Projects`

### ⭐ Séries em destaque

> [!abstract]+ 📦 DUIMP — Importação Direta
> *XML → staging → vínculo → confronto*
>
> | Nota | Descrição |
> |------|-----------|
> | [[DUIMP - Visão Geral do Processo]] | 🗺️ Índice/fluxo completo da série DUIMP |
> | [[DUIMP - Importação de XML]] | Importação do XML para tabelas Oracle via `XMLTABLE` + `DBMS_LOB` |
> | [[DUIMP - Vinculação com Pedido de Importação]] | Liga a DUIMP ao Pedido e preenche câmbio, itens e despesas (`NAGP_IMP_DADOS_DUIMP`) |
> | [[DUIMP - Relatório Comparativo XML x ERP]] | Relatório Centura que confronta DUIMP × Pedido por item |
> | [[DUIMP - Plano de melhoria de Processos.canvas\|DUIMP — Plano de melhoria]] | 🎨 Canvas de evolução do processo |

> [!abstract]+ 🛒 Lote de Compras Automático
> *Geração, consolidação e arredondamento de lotes de compra*
>
> | Nota | Descrição |
> |------|-----------|
> | [[Lote de Compra - Geração Automática]] | Geração automática de lotes com sugestão MIN/MAX |
> | [[Lote de Compras — Acata Sugerido e Consolidação]] | Trigger BEFORE INSERT + COMPOUND — `NAGT_COMP_FORN_SUGESTAUTO` |
> | [[Acata Sugerido Automático no Lote de Compras]] | Acata automático do valor sugerido na inserção |
> | [[Sugestão Consolidada com Arredondamento — Lote de Compras]] | Consolidação com arredondamento logístico |
> | [[Instrucoes — Parametrizacao Acata Sugerido e Consolidacao]] | 📘 Guia de parametrização |

> [!abstract]+ 💰 Régua de Cobrança
> *Cobrança escalonada automatizada*
>
> | Nota | Descrição |
> |------|-----------|
> | [[Régua de Cobrança - Escopo]] | Escopo, regras e definição do projeto |
> | [[Régua de Cobrança - Implementação]] | Cobrança escalonada D0→D+15 + e-mail + bloqueio de lote |
> | [[Régua de Cobrança - Notificação Genérica]] | Variante sem detalhes de acordo (solicitação da diretoria) |
> | [[Régua de Cobrança - Elegíveis]] | Restrita a fornecedores elegíveis por rede — `NIVEL_REGUA` |

### 🧩 Outros projetos

> [!abstract]+ Automações & desenvolvimentos diversos
> | Nota | Descrição |
> |------|-----------|
> | [[Oracle Auto Reports - Whatsapp Bot]] | Agente Oracle integrado ao WhatsApp |
> | [[KPIs - Alertas Carga PDV (CTD)]] | 10 KPIs da `NAGT_CONTROLECARGAPDV` — ranking, heatmap, evolução |
> | [[Ecommerce - Replicação de Ofertas PDV TOTVS]] | Replica ofertas do Meu Nagumo para o PDV TOTVS via remarca |
> | [[Ecommerce - Replicação por Encarte (MN)]] | Substituto do legado — usa encartes nativos do ERP |
> | [[Pricing - Controle de Datas]] | Rebaixa de produtos próximos ao vencimento — etiqueta rosa |
> | [[Pricing - Controle de Validade - Layout Etiqueta]] | Layout etiqueta dupla + view `MRLV_PROMOCAOESPECIAL` |
> | [[Alerta Status SEFAZ]] | Sincroniza status dos webservices SEFAZ (NFe/NFC-e) |
> | [[Alerta NFe NFCe - E-mail]] | E-mail ao Fiscal com rejeições/pendências dos últimos 3 dias |
> | [[Controle de Selos - Campanha de Selos PDV]] | Controle de campanhas de selos no PDV |
> | [[Cust - Trava Cadastro Família e Produto]] | Hooks de validação TOTVS p/ travar salvamento |
> | [[Extração de XMLs]] | Extração e processamento de XMLs fiscais |
> | [[Etiqueta FLV - Informação Nutricional]] | View Oracle que gera ZPL de etiqueta nutricional FLV (Zebra) |
> | [[Impressão de Crachás - Eventiza]] | App web local (HTML + Node.js) — XLSX → crachás ZPL |
> | [[Tae - Assinatura Eletrônica]] | Integração com TOTVS Assinatura Eletrônica |

---

## 🔌 Integrações

> Exportação de dados para plataformas e parceiros externos.
> 📁 `70-Projects, Tools & Integrations / Integrations`

> [!example]+ Plataformas conectadas
> | Integração | Plataforma | Dados exportados |
> |------------|-----------|-----------------|
> | [[Instaleap]] | Instaleap / Meu Nagumo | Catálogo · Produto (EAN, foto, nutrição) · Promoções |
> | [[Backlgrs - Salesforce]] | Backlgrs CRM | Catálogo · Produto · Clientes · Filiais · Vendas · Ofertas |
> | [[Seal - Etiquetas Eletrônicas]] | SEAL | Preço normal, tabloide e Cartão Nagumo p/ etiquetas de gôndola |
> | [[BLB - Extracao Fiscal]] | BLB | NF-e saídas, entradas e cupons SAT → CSV |
> | [[Falconi - Extração de Bases]] | Falconi (consultoria) | Estoque (BASE01) · Vendas e Compras com margem (BASE56) |

---

## 🛠️ Ferramentas

> Utilitários e procedimentos de apoio operacional.
> 📁 `70-Projects, Tools & Integrations / Tools`

> [!tip]+ Utilitários & procedimentos
> | Ferramenta | Descrição |
> |------------|-----------|
> | [[Gerador de Pedidos Ecommerce]] | Geração de pedidos para o e-commerce |
> | [[Controle de Promoções - Inaugurações]] | Controle de promoções de inauguração |
> | [[Validador de EAN13]] | Validação de códigos de barras EAN-13 |
> | [[Inserção de Títulos ISSQN e SERVRC]] | Insere manualmente títulos ISSQN/SERVRC não gerados |
> | [[Apuração CAT 28]] | Exclusão de produtos do regime ST (CAT 28/SP) — TXT por loja |
> | [[API - SQL de Tela Web TOTVS]] | Descobrir SQL de tela Web TOTVS via DevTools + `V$SQL` |
> | [[Fiscal - NFS-e Aguardando Retorno]] | Desbloquear NFS-e presa via reenvio duplo |
> | [[Fiscal - NF-e Reenvio com Correção de Chave EPEC]] | Desfaz troca EPEC e reenvia via NDD (`NAGP_NFE_REENVIANF`) |
> | [[Validação de Cadastros Tributários - vMaster]] | 22 validações fiscais — NCM, CST, IPI, ST, cBenef, origem |
> | [[Auditoria de Alterações - MRL_EMPSOFTPDV]] | Trigger de log da config de software PDV por empresa |
> | [[Comercial - Fórmula de Cálculo de Margem]] | Três formas de cálculo de margem: Custo, Simulação, Consulta |

---

## 📊 GLPI — Analytics de Helpdesk

> [!note]+ Dashboards gerenciais via DBLink Oracle → MySQL
> Selects Oracle SQL (via `@DBL_ORCL_TO_MYSQL`) para relatórios do GLPI.
> 📁 `71-GLPI / Prototypes`
>
> | Dashboard | Foco |
> |-----------|------|
> | [[Volume e Tendências]] | Abertos/fechados por mês, dia, semana, hora e dia da semana |
> | [[Backlog]] | Backlog por equipe, técnico, categoria, prioridade, idade e SLA |
> | [[SLA]] | SLA cumprido × perdido, MTTA e MTTR global |
> | [[Produtividade]] | Resolvidos, atribuídos, ranking, horas e reaberturas |
> | [[Categorias]] | Distribuição, subcategorias, evolução, crescimento e Pareto |
> | [[Solicitantes]] | Top usuários por departamento, empresa e localização |
> | [[Técnicos]] | Carga, pendentes, fechados, MTTA e MTTR por técnico |
> | [[Status e Fluxo]] | Distribuição por status, tempo em status, transições |
> | [[Qualidade]] | Reaberturas, reincidentes, duplicados, top problemas |
> | [[Prioridades]] | Distribuição, críticos em aberto, MTTR por prioridade |
> | [[Grupos]] | Chamados, produtividade, SLA e backlog por grupo |
> | [[Tempo e Custos]] | Horas registradas, faturáveis, paradas e custo por chamado |
> | [[Análise Executiva]] | Top assuntos, Pareto, tendência c/ média móvel, heatmaps |
> | [[Rastreabilidade de Chamados]] | Histórico, soluções, followups, tarefas e vínculos |
> | [[_hs_str — Conversão UTF-16 via DBLink]] | Corrige truncamento VARCHAR por encoding UTF-16 LE |

---

## 🏷️ Índice por Área de Negócio

> [!question]+ Navegação temática cruzada
> *Mesma documentação organizada pelo domínio do negócio — útil quando você sabe "o quê" mas não "onde".*
>
> | Área | Conteúdos relacionados |
> |------|------------------------|
> | 🧾 **Fiscal / Tributário** | [[Alerta Status SEFAZ]] · [[Alerta NFe NFCe - E-mail]] · [[Fiscal - NFS-e Aguardando Retorno]] · [[Fiscal - NF-e Reenvio com Correção de Chave EPEC]] · [[Validação de Cadastros Tributários - vMaster]] · [[Apuração CAT 28]] · [[Inserção de Títulos ISSQN e SERVRC]] · [[BLB - Extracao Fiscal]] · [[Extração de XMLs]] |
> | 📦 **Compras / Suprimentos** | [[Lote de Compra - Geração Automática]] · [[Lote de Compras — Acata Sugerido e Consolidação]] · [[Régua de Cobrança - Implementação]] · [[DUIMP - Visão Geral do Processo]] |
> | 💲 **Comercial / Pricing** | [[Pricing - Controle de Datas]] · [[Pricing - Controle de Validade - Layout Etiqueta]] · [[Comercial - Fórmula de Cálculo de Margem]] · [[Controle de Promoções - Inaugurações]] · [[Seal - Etiquetas Eletrônicas]] |
> | 🛒 **E-commerce** | [[Instaleap]] · [[Ecommerce - Replicação de Ofertas PDV TOTVS]] · [[Ecommerce - Replicação por Encarte (MN)]] · [[Gerador de Pedidos Ecommerce]] · [[Backlgrs - Salesforce]] |
> | 🖥️ **PDV / Operação de Loja** | [[KPIs - Alertas Carga PDV (CTD)]] · [[Controle de Selos - Campanha de Selos PDV]] · [[Auditoria de Alterações - MRL_EMPSOFTPDV]] · [[Etiqueta FLV - Informação Nutricional]] · [[Impressão de Crachás - Eventiza]] |
> | 🌐 **Integrações & Parceiros** | [[Instaleap]] · [[Backlgrs - Salesforce]] · [[Seal - Etiquetas Eletrônicas]] · [[BLB - Extracao Fiscal]] · [[Falconi - Extração de Bases]] |
> | 🎫 **Helpdesk (GLPI)** | [[Análise Executiva]] · [[SLA]] · [[Backlog]] · [[Produtividade]] · [[Rastreabilidade de Chamados]] |

---

## 📁 Estrutura do Vault

> [!abstract]+ Mapa de diretórios
> ```
> content/
> ├── 70-Projects, Tools & Integrations/
> │   ├── Projects/        → Automações e rotinas do ERP
> │   ├── Integrations/     → Exportações para parceiros externos
> │   └── Tools/            → Utilitários e procedimentos
> └── 71-GLPI/
>     └── Prototypes/       → Dashboards e selects de helpdesk
> ```

---

> [!quote] Sobre este Vault
> Mantido por **Giuliano** · Desenvolvimento & Integrações — Nagumo
> Base documental de ERP **Consinco / PDV TOTVS** · Oracle · Automações
> 🔗 **[GitHub → GiulianoGMS](https://github.com/GiulianoGMS)**
