---
title: Vault One
---

# Vault One

> [!info] Base de conhecimento técnico
> Scripts, projetos, automações e integrações do ERP **Consinco / PDV TOTVS**.
> Documentação viva de rotinas Oracle, triggers, relatórios e ferramentas de apoio operacional.
>
> Repositórios e objetos disponíveis no **[GitHub → GiulianoGMS](https://github.com/GiulianoGMS)**

---

> [!tip]+ Navegação rápida
> | | | |
> |:--|:--|:--|
> | **[Projetos](#projetos)** | **[Integrações](#integrações)** | **[Ferramentas](#ferramentas)** |
> | **[DUIMP](#duimp--importação-direta)** | **[Lote de Compras](#lote-de-compras-automático)** | **[Régua de Cobrança](#régua-de-cobrança)** |

---

## Projetos

Rotinas, automações e desenvolvimentos internos sobre o ERP.
📁 `70-Projects, Tools & Integrations / Projects`

### DUIMP — Importação Direta
> [!abstract]+ Série completa: XML → staging → vínculo → confronto
> | Nota | Descrição |
> |------|-----------|
> | [[DUIMP - Visão Geral do Processo]] | Índice/fluxo completo da série DUIMP |
> | [[DUIMP - Importação de XML]] | Importação do XML da DUIMP para tabelas Oracle via `XMLTABLE` + `DBMS_LOB` |
> | [[DUIMP - Vinculação com Pedido de Importação]] | Liga a DUIMP a um Pedido de Importação e preenche câmbio, itens e despesas (`NAGP_IMP_DADOS_DUIMP`) |
> | [[DUIMP - Relatório Comparativo XML x ERP]] | Relatório Centura que confronta DUIMP × Pedido por item (qtd, peso, II/IPI/PIS/COFINS) |
> | [[DUIMP - Plano de melhoria de Processos.canvas\|DUIMP - Plano de melhoria de Processos]] | Canvas de evolução e melhoria do processo |

### Lote de Compras Automático
> [!abstract]+ Geração, consolidação e arredondamento de lotes de compra
> | Nota | Descrição |
> |------|-----------|
> | [[Lote de Compra - Geração Automática]] | Geração automática de lotes com sugestão MIN/MAX |
> | [[Lote de Compras — Acata Sugerido e Consolidação]] | Trigger BEFORE INSERT + COMPOUND TRIGGER — coordenados por `NAGT_COMP_FORN_SUGESTAUTO` |
> | [[Acata Sugerido Automático no Lote de Compras]] | Acata automático do valor sugerido no momento da inserção do lote |
> | [[Sugestão Consolidada com Arredondamento — Lote de Compras]] | Consolidação da sugestão com arredondamento logístico |

### Régua de Cobrança
> [!abstract]+ Cobrança escalonada automatizada
> | Nota | Descrição |
> |------|-----------|
> | [[Régua de Cobrança - Escopo]] | Escopo, regras e definição do projeto |
> | [[Régua de Cobrança - Implementação]] | Cobrança escalonada D0→D+15 com e-mail automático + bloqueio de lote de compras |
> | [[Régua de Cobrança - Notificação Genérica]] | Variante sem detalhes de acordo no e-mail (solicitação da diretoria) |
> | [[Régua de Cobrança - Elegíveis]] | Restrita a fornecedores elegíveis por rede — view com `NIVEL_REGUA` |

### Outros Projetos
> [!abstract]+ Desenvolvimentos e automações diversas
> | Nota | Descrição |
> |------|-----------|
> | [[Oracle Auto Reports - Whatsapp Bot]] | Agente Oracle integrado ao WhatsApp |
> | [[KPIs - Alertas Carga PDV (CTD)]] | 10 KPIs da `NAGT_CONTROLECARGAPDV` — ranking, checkouts, heatmap e evolução diária |
> | [[Ecommerce - Replicação de Ofertas PDV TOTVS]] | Replica ofertas do Meu Nagumo para o PDV TOTVS via remarca |
> | [[Ecommerce - Replicação por Encarte (MN)]] | Substituto da replicação legado — usa encartes nativos do ERP |
> | [[Pricing - Controle de Datas]] | Rebaixa automática de produtos próximos ao vencimento — etiqueta rosa + promoções |
> | [[Pricing - Controle de Validade - Layout Etiqueta]] | Layout da etiqueta dupla + view de emissão `MRLV_PROMOCAOESPECIAL` |
> | [[Alerta Status SEFAZ]] | Sincroniza status dos webservices SEFAZ (NFe/NFC-e) e dispara alerta no ERP |
> | [[Alerta NFe NFCe - E-mail]] | E-mail automático ao time Fiscal com rejeições/pendências dos últimos 3 dias |
> | [[Controle de Selos - Campanha de Selos PDV]] | Controle de campanhas de selos no PDV |
> | [[Cust - Trava Cadastro Família e Produto]] | Hooks de validação TOTVS para travar salvamento de Família e Produto |
> | [[Extração de XMLs]] | Extração e processamento de XMLs fiscais |
> | [[Etiqueta FLV - Informação Nutricional]] | View Oracle que gera ZPL de etiqueta nutricional FLV (Zebra) |
> | [[Impressão de Crachás - Eventiza]] | App web local (HTML + Node.js) que importa XLSX e imprime crachás ZPL na Zebra |
> | [[Tae - Assinatura Eletrônica]] | Integração com TOTVS Assinatura Eletrônica |
> | [[Instrucoes — Parametrizacao Acata Sugerido e Consolidacao]] | Guia de parametrização do acata sugerido + consolidação |

---

## Integrações

Exportação de dados para plataformas e parceiros externos.
📁 `70-Projects, Tools & Integrations / Integrations`

> [!example]+ Plataformas conectadas
> | Integração | Plataforma | Dados exportados |
> |------------|-----------|-----------------|
> | [[Instaleap]] | Instaleap / Meu Nagumo | Catálogo (estoque, preço, status) · Produto (cadastro, EAN, foto, nutrição) · Promoções |
> | [[Backlgrs - Salesforce]] | Backlgrs CRM | Catálogo · Produto · Clientes (CPF, push token) · Filiais · Vendas · Ofertas |
> | [[Seal - Etiquetas Eletrônicas]] | SEAL | Preço normal, tabloide e Cartão Nagumo para etiquetas eletrônicas de gôndola |
> | [[BLB - Extracao Fiscal]] | BLB | NF-e saídas, entradas e cupons SAT — exportação para CSV |
> | [[Falconi - Extração de Bases]] | Falconi (consultoria) | Estoque consolidado (BASE01) · Vendas e Compras com margem (BASE56) |

---

## Ferramentas

Utilitários e procedimentos de apoio operacional.
📁 `70-Projects, Tools & Integrations / Tools`

> [!tip]+ Utilitários & procedimentos
> | Ferramenta | Descrição |
> |------------|-----------|
> | [[Gerador de Pedidos Ecommerce]] | Geração de pedidos para o e-commerce |
> | [[Controle de Promoções - Inaugurações]] | Controle de promoções de inauguração |
> | [[Validador de EAN13]] | Validação de códigos de barras EAN-13 |
> | [[Inserção de Títulos ISSQN e SERVRC]] | Insere manualmente títulos ISSQN/SERVRC não gerados no recebimento |
> | [[Apuração CAT 28]] | Exclusão periódica de produtos do regime ST (CAT 28/SP) — geração de TXT por loja |
> | [[API - SQL de Tela Web TOTVS]] | Como descobrir a consulta SQL de uma tela Web TOTVS via DevTools + `V$SQL` |
> | [[Fiscal - NFS-e Aguardando Retorno]] | Desbloquear NFS-e presa em "Aguardando Retorno" via reenvio duplo |
> | [[Fiscal - NF-e Reenvio com Correção de Chave EPEC]] | Desfaz troca de chave EPEC e reenvia NF-e original via NDD (`NAGP_NFE_REENVIANF`) |
> | [[Validação de Cadastros Tributários - vMaster]] | 22 validações de cadastro fiscal — NCM, CST, IPI, ST, cBenef, origem |
> | [[Auditoria de Alterações - MRL_EMPSOFTPDV]] | Trigger de log `BEFORE UPDATE` da configuração de software PDV por empresa |
> | [[Comercial - Fórmula de Cálculo de Margem]] | Três formas de cálculo de margem do ERP: Custo, Simulação e Consulta Produto |

---

## GLPI — Dashboards (Helpdesk)

> [!note]+ Relatórios gerenciais via DBLink Oracle → MySQL
> Selects Oracle SQL (via DBLink `@DBL_ORCL_TO_MYSQL`) para relatórios do GLPI (helpdesk/chamados).
> 📁 `71-GLPI / Prototypes`
>
> | Dashboard | Foco |
> |-----------|------|
> | [[Volume e Tendências]] | Chamados abertos/fechados por mês, dia, semana, hora e dia da semana |
> | [[Backlog]] | Backlog por equipe, técnico, categoria, prioridade, idade e SLA vencido |
> | [[SLA]] | SLA cumprido × perdido, MTTA e MTTR global |
> | [[Produtividade]] | Resolvidos, atribuídos, ranking, horas gastas e reaberturas |
> | [[Categorias]] | Distribuição, subcategorias, evolução, crescimento e Pareto |
> | [[Solicitantes]] | Top usuários por departamento, empresa, localização e unidade |
> | [[Técnicos]] | Carga, pendentes, fechados, MTTA e MTTR por técnico |
> | [[Status e Fluxo]] | Distribuição por status, tempo em cada status, transições |
> | [[Qualidade]] | Reaberturas, reincidentes, duplicados, top problemas |
> | [[Prioridades]] | Distribuição, críticos/urgentes em aberto, MTTR por prioridade |
> | [[Grupos]] | Chamados, produtividade, SLA e backlog por grupo responsável |
> | [[Tempo e Custos]] | Horas registradas, faturáveis, paradas e custo por chamado |
> | [[Análise Executiva]] | Top assuntos, Pareto, tendência com média móvel, heatmaps |
> | [[Rastreabilidade de Chamados]] | Histórico, alterações, soluções, followups, tarefas e vínculos |
> | [[_hs_str — Conversão UTF-16 via DBLink]] | Função Oracle que corrige truncamento VARCHAR por encoding UTF-16 LE |

---

> [!quote] Sobre este Vault
> Mantido por **Giuliano** · Desenvolvimento & Integrações — Nagumo
> Base documental de ERP Consinco / PDV TOTVS · Oracle · Automações
