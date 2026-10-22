---
title: Pendências
---

# 📋 Pendências

> [!tip]+ Navegação
> [🔴 Urgente / Prioridade](#-urgente--prioridade) · [🛠️ Desenvolvimento / Sistema](#️-desenvolvimento--sistema) · [✅ Concluídas](#-concluídas)

---

## 🔴 Urgente / Prioridade

- [ ] **Priori 1** — [[Falconi]] 754485 · Dash · Query Qlik Verbas → **Validar prazo**
- [ ] **Priori 2** — [[Falconi]] Ticket TOTVS → Subir TAE mesmo com acordo cancelado

---

## 🛠️ Desenvolvimento / Sistema

- [ ] **Crítica no Gerenciador de Preços** — evitar que o usuário precifique produtos até 40% abaixo do preço normal.
  > [!info] 40% — definido por Thaise em 12/08 (Wts Raquel Price).
- [ ] **Crítica de Açougue** no referenciamento de NFs vs Pedidos — criticar vínculo se não for o pedido mais antigo disponível.
- [ ] **Crítica no recebimento de transferência CD → Loja** sem pedido vinculado.
- [ ] **Parametrizar fornecedores do lote automático** — Juliana (Fornecedor + Percentual), Cíntia (Percentual), Rebeca e time.
- [ ] **Validar com Alan** a dinâmica para **Família/Associado** nas Promoções "A Partir De".
- [ ] Adicionar regra de aprovação automatica por categoria, exceto Commodities, ref pj [[Pricing - Controle de Datas]]

---

## ✅ Concluídas

- [x] **Carga de preços da [[SEAL]]** — definido (14/10) que serão enviadas à Seal as atualizações realizadas há mais de **XX minutos**. **Leo** criará a rotina recorrente na chamada da API; SEAL recomendou chamar **após a carga do PDV**. (Validado com Cipolla em 15/10.)
- [x] **Validar em homologação** a rotina [[PDV - Combos Promocionais - Adequação Fiscal]].
- [x] **Extração de Dados Certacon** — 01/04/26 à 14/08/26.
- [x] **Analisar títulos financeiros (ISS)** — Solic. Dina, venceram em 13/10.
- [x] **Extrair base Falconi** — Setembro.
- [x] **Controle de Datas (CD)** — implementar data do pulmão na rotina de conferência das lojas (`NAGV_APPDATA_VALIDADE_V3`) — Prazo: 13/10.
- [x] **Cálculo de Margem** — ([[Comercial - Fórmula de Cálculo de Margem]]).
- [x] **Ativar segmento Ecommerce na loja 10** + equiparar preços do segmento.
- [x] **Validar tipo de arredondamento** no projeto [[Lote de Compras — Acata Sugerido e Consolidação]] — Rebeca e time querem apenas **Palete Lastro** (regra aplicava a ambos).
- [x] **Desenvolver a view de preços** para integração com a **Seal** (etiquetas eletrônicas) — [[Seal - Etiquetas Eletrônicas]].
- [x] **Validar importação do XML DUIMP** para confronto na **DI do ERP** — ([[DUIMP - Visão Geral do Processo]]).
- [x] **Treinamento [[Cotação WEB]]** para o time comercial — 31/08.
  > [!info] Alinhado com o consultor antes: trabalhar com FLV e gerar pedidos a partir do [[Gerenciador de Compras]] ([[Pedido Cotação]]).
- [x] **Cancelamento de saldo de pedidos antigos** — prazo até 04/09 (Cipolla).
- [x] **Gerar arquivos BLB** — ([[BLB - Extracao Fiscal]]).
- [x] **Gerar arquivos de estoque/venda do mês anterior** para a **Falconi**.
- [x] **Data de validade CD** — confirmar data no endereço amarrado à carga.
- [x] **Isabela** — abrir chamado para criação de pedido de venda para retirada de produtos para a loja nova 62.
- [x] **Régua de Cobrança** — remover informações do Acordo/Valor do e-mail automático de cobrança ([[Régua de Cobrança - Notificação Genérica]]).
- [x] **Aplicação pacote de correção Perda Unificada** (NFe de Débito de Perda).
- [x] **Troca de Credenciais** — MonitorPDV 16/08~17/08.
- [x] **Enviar comprovante de pagamento PIX** [[GS1]].
- [x] **Enviar certificados** [[NFSE]].
- [x] **Agendar treinamento de agendamento WEB** no [[WMS]] (Abdala envia a data, combinar com o Marcio).
- [x] **Implantação NFS-e**.
- [x] **Solicitar/enviar comprovante de pagamento** [[GS1]] no histórico do e-mail com GS1 (Time da Simone).
- [x] **Levantar volume de lotes** que os compradores estão utilizando sugestão do sistema.
- [x] **Acompanhar os processos de antecipação da** [[AGG]].
- [x] **Plantões** 25/08.
