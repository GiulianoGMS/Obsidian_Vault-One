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
> | [[Oracle Auto Reports - Whatsapp Bot]] | Agente Oracle integrado ao WhatsApp 
> | [[BLB - Extracao Fiscal]] | Extração fiscal de NF-e saídas, entradas e cupons SAT para CSV |
> | [[Lote de Compra - Geração Automática]] | Geração automática de lotes de compra com sugestão MIN/MAX |
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
> | [[Correção de Impostos no Recebimento]] | Paliativos CBS/IBS/IPI/ICMS Desonerado aplicados no recebimento de NF-e (Reforma Tributária) |
> | [[Alerta Status SEFAZ]] | Sincroniza status dos webservices SEFAZ (NFe/NFC-e) em tabela Oracle e dispara alerta no ERP |
> | [[Etiqueta FLV - Informação Nutricional]] | View Oracle que gera ZPL de etiqueta nutricional FLV — pivot de nutrientes do ERP para impressora Zebra |

> [!example]+ Integrações
> Exportações e sincronizações com plataformas externas via CSV / UTL_FILE.
>
> | Integração | Plataforma | Dados exportados |
> |------------|-----------|-----------------|
> | [[Instaleap]] | Instaleap / Meu Nagumo | Catálogo (estoque, preço, status) · Produto (cadastro, EAN, foto, nutrição) · Promoções |
> | [[Backlgrs - Salesforce]] | Backlgrs CRM | Catálogo · Produto · Clientes (CPF, push token) · Filiais · Vendas · Ofertas |

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
> | [[Validação de Cadastros Tributários - vMaster]] | 22 validações de cadastro fiscal de produtos — NCM, CST, IPI, ST, cBenef, origem IMP/NAC |

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