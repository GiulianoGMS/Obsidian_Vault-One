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
> |[[Cust - Trava Cadastro Família e Produto]]] | Hooks de validação TOTVS para travar salvamento no cadastro de Família e Produto |

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