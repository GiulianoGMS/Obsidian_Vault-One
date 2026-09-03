---
title: Vault One
---
Base de conhecimento técnico — scripts, projetos e integrações do ERP **Consinco / PDV TOTVS**.
Objetos e repositórios disponíveis no [GitHub →](https://github.com/GiulianoGMS)

---

> [!abstract]+ Projetos
> Rotinas, automações e desenvolvimentos internos.
>
> | Projeto | Descrição |
> |---------|-----------|
> | [[Oracle Auto Reports - Whatsapp Bot]] | Agente Oracle integrado ao WhatsApp |
> | [[KPIs - Alertas Carga PDV (CTD)]] | 10 KPIs de análise da tabela `NAGT_CONTROLECARGAPDV` — ranking de lojas, checkouts, tabelas, heatmap e evolução diária |
> | [[Lote de Compra - Geração Automática]] | Geração automática de lotes de compra com sugestão MIN/MAX |
> | [[Lote de Compras — Acata Sugerido e Consolidação]] | Trigger BEFORE INSERT (acata sugerido automático) + COMPOUND TRIGGER (consolidação + arredondamento logístico) — coordenados por `NAGT_COMP_FORN_SUGESTAUTO` |
> | [[Validações de Inconsistências - PDV TOTVs]] | Validações de produtos, famílias e tributações — PKG_INCONSISTENCIAS |
> | [[Ecommerce - Replicação de Ofertas PDV TOTVS]] | Replica ofertas do Meu Nagumo para o PDV TOTVS via remarca |
> | [[Ecommerce - Replicação por Encarte (MN)]] | Substituto da replicação legado — usa encartes nativos do ERP |
> | [[Controle de Selos - Campanha de Selos PDV]] | Controle de campanhas de selos no PDV |
> | [[Extração de XMLs]] | Extração e processamento de XMLs fiscais |
> | [[Pricing - Controle de Datas]] | Rebaixa automática de produtos próximos ao vencimento — etiqueta rosa + promoções |
> | [[Pricing - Controle de Validade - Layout Etiqueta]] | Layout da etiqueta dupla de validade + view de emissão `MRLV_PROMOCAOESPECIAL` |
> | [[Tae - Assinatura Eletrônica]] | Integração com TOTVS Assinatura Eletrônica |
> | [[Cust - Trava Cadastro Família e Produto]] | Hooks de validação TOTVS para travar salvamento no cadastro de Família e Produto |
> | [[Régua de Cobrança - Implementação]] | Cobrança escalonada D0→D+15 com e-mail automático e bloqueio de lote de compras |
> | [[Régua de Cobrança - Notificação Genérica]] | Variante da régua sem detalhes de acordo no e-mail — solicitação da diretoria |
> | [[Régua de Cobrança - Elegíveis]] | Variante restrita a fornecedores elegíveis por rede — view com NIVEL_REGUA + e-mail genérico escalonado |
> | [[Correção de Impostos no Recebimento]] | Paliativos CBS/IBS/IPI/ICMS Desonerado aplicados no recebimento de NF-e (Reforma Tributária) |
> | [[Alerta Status SEFAZ]] | Sincroniza status dos webservices SEFAZ (NFe/NFC-e) em tabela Oracle e dispara alerta no ERP |
> | [[Alerta NFe NFCe - E-mail]] | E-mail automático ao time Fiscal com rejeições e pendências de NF-e/NFC-e dos últimos 3 dias |
> | [[Etiqueta FLV - Informação Nutricional]] | View Oracle que gera ZPL de etiqueta nutricional FLV — pivot de nutrientes do ERP para impressora Zebra |
> | [[Impressão de Crachás - Eventiza]] | App web local (HTML + Node.js, zero deps) que importa XLSX da Eventiza e imprime crachás ZPL na Zebra via check-in |
> | [[Falconi]] | — |

> [!example]+ Integrações
> Exportações e sincronizações com plataformas externas via CSV / UTL_FILE.
>
> | Integração | Plataforma | Dados exportados |
> |------------|-----------|-----------------|
> | [[Instaleap]] | Instaleap / Meu Nagumo | Catálogo (estoque, preço, status) · Produto (cadastro, EAN, foto, nutrição) · Promoções |
> | [[Backlgrs - Salesforce]] | Backlgrs CRM | Catálogo · Produto · Clientes (CPF, push token) · Filiais · Vendas · Ofertas |
> | [[BLB - Extracao Fiscal]] | BLB | NF-e saídas, entradas e cupons SAT — exportação para CSV |

> [!tip]+ Ferramentas
> Utilitários e ferramentas de apoio operacional.
>
> | Ferramenta | Descrição |
> |------------|-----------|
> | [[Gerador de Pedidos Ecommerce]] | Geração de pedidos para o e-commerce |
> | [[Controle de Promoções - Inaugurações]] | Controle de promoções de inauguração |
> | [[Validador de EAN13]] | Validação de códigos de barras EAN-13 |
> | [[Inserção de Títulos ISSQN e SERVRC]] | Insere manualmente títulos ISSQN/SERVRC não gerados no recebimento de NF-e de serviço |
> | [[Apuração CAT 28]] | Apuração periódica de exclusão de produtos do regime ST (CAT 28/SP) — geração de TXT por loja |
> | [[API - SQL de Tela Web TOTVS]] | Como descobrir qual consulta SQL uma tela Web da TOTVS executa via DevTools + V$SQL |
> | [[Fiscal - NFS-e Aguardando Retorno]] | Procedimento para desbloquear NFS-e presa em "Aguardando Retorno" via reenvio duplo |
> | [[Validação de Cadastros Tributários - vMaster]] | 22 validações de cadastro fiscal de produtos — NCM, CST, IPI, ST, cBenef, origem IMP/NAC |
> | [[Auditoria de Alterações - MRL_EMPSOFTPDV]] | Trigger de log `BEFORE UPDATE` que rastreia alterações na configuração de software PDV por empresa |
> | [[Comercial - Fórmula de Cálculo de Margem]] | Três formas de cálculo de margem do ERP: Tabela de Custo, Simulação e Consulta Produto |

> [!note]+ GLPI — Dashboards via DBLink Oracle → MySQL
> Selects Oracle SQL (via DBLink `@DBL_ORCL_TO_MYSQL`) para relatórios gerenciais do GLPI (helpdesk/chamados).
>
> | Finalidade | Descrição |
> |------------|-----------|
> | [[Volume e Tendências]] | Chamados abertos/fechados por mês, dia, semana, hora e dia da semana |
> | [[Backlog]] | Backlog atual por equipe, técnico, categoria, prioridade, idade e SLA vencido |
> | [[SLA]] | SLA cumprido × perdido, por equipe/prioridade/categoria, MTTA e MTTR global |
> | [[Produtividade]] | Resolvidos, atribuídos, ranking, horas gastas e reaberturas por técnico |
> | [[Categorias]] | Distribuição, subcategorias, evolução mensal, crescimento e Pareto |
> | [[Solicitantes]] | Top usuários, por departamento, empresa, localização e unidade |
> | [[Técnicos]] | Carga, pendentes, fechados, MTTA e MTTR por técnico |
> | [[Status e Fluxo]] | Distribuição por status, tempo em cada status, fluxo de transições |
> | [[Qualidade]] | Reaberturas, reincidentes, duplicados, top problemas e busca por palavras |
> | [[Prioridades]] | Distribuição, críticos e urgentes em aberto, MTTR por prioridade |
> | [[Grupos]] | Chamados, produtividade, SLA e backlog por grupo responsável |
> | [[Tempo e Custos]] | Horas registradas, faturáveis, paradas e custo por chamado |
> | [[Análise Executiva]] | Top assuntos, Pareto, tendência com média móvel, crescimento e heatmaps |
> | [[Rastreabilidade de Chamados]] | Histórico completo, alterações, soluções, followups, tarefas e vínculos |
> | [[_hs_str — Conversão UTF-16 via DBLink]] | Função Oracle que corrige truncamento VARCHAR causado por encoding UTF-16 LE do driver ODBC MySQL |