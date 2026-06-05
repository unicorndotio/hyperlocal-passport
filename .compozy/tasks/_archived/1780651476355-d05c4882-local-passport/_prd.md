# Passaporte Local - Product Requirements Document

## Overview

O "Passaporte Local" é uma plataforma focada em fomentar a economia circular e o
consumo nos estabelecimentos e prestadores de serviço do bairro (inicialmente
Jurerê).

- **Que problema resolve:** Moradores não possuem incentivos para priorizar as
  lojas do próprio bairro; os comércios locais têm dificuldade em atrair e
  fidelizar os moradores residentes.
- **Para quem é feito:** Moradores que desejam descontos e valorizar seu
  entorno, e Comerciantes/Serviços que desejam captar esse público através de
  benefícios exclusivos.
- **Por que é valioso:** Cria um senso de comunidade, movimenta o dinheiro na
  economia local e gera economia direta no bolso do morador e novas vendas para
  os parceiros.

## Goals

- Estabelecer uma rede inicial de parceiros que ofereçam entre 5% a 30% de
  desconto.
- Lançar um catálogo digital rápido (Web App Mobile-first) onde os moradores
  possam descobrir essas ofertas.
- Criar e validar a rotina de uso no caixa da loja física através da validação
  de QR Code ou CPF.
- Criar um funil de cadastro seguro, validando que apenas moradores reais da
  região possuem acesso aos benefícios.

## User Stories

### Morador

- Como morador, eu quero me cadastrar enviando meu comprovante de residência
  para ter acesso a benefícios exclusivos.
- Como morador, eu quero ver um catálogo de empresas locais divididas por
  categorias (Casa, Corpo, Alimentação, Esporte, etc) para descobrir onde posso
  consumir.
- Como morador, eu quero gerar um "Passaporte" (QR Code ou número/CPF) na tela
  do meu celular para obter descontos no momento do pagamento na loja física.

### Lojista / Prestador de Serviço

- Como lojista, eu quero ter o meu logotipo, segmento e desconto (5% a 30%)
  exibidos em uma página de perfil para atrair clientes do bairro.
- Como lojista, eu quero acessar um painel web no computador do meu caixa para
  escanear o QR Code (ou digitar o CPF) do morador.
- Como lojista, eu quero digitar o valor total da compra neste painel, para que
  o sistema me mostre exatamente qual é o valor do desconto a ser concedido,
  gerando um registro da economia.

### Administrador (Backoffice)

- Como administrador, eu quero receber notificações de novos cadastros de
  moradores e poder verificar os documentos enviados.
- Como administrador, eu quero aprovar ou rejeitar os cadastros para garantir a
  integridade da comunidade.
- Como administrador, eu quero cadastrar as lojas parceiras na plataforma e
  associar as contas, pois o processo de pagamento e assinatura dessas lojas é
  feito por fora do aplicativo.

## Core Features

1. **Cadastro e Onboarding do Morador:**
   - Formulário coletando: Nome, CPF, Email, Componentes familiares, Documento
     com foto (upload) e Comprovante de residência (upload).
   - Tela de "Aguardando Aprovação" (com aviso de SLA de 1 dia útil).

2. **Catálogo de Vantagens:**
   - Tela inicial mobile com as categorias mapeadas (Casa, Corpo, Alimentação,
     Esporte, etc).
   - Perfis detalhados para cada loja/serviço (comentários futuros podem ser
     implementados, mas a visualização do desconto é o foco).

3. **Carteirinha Digital (Passaporte):**
   - Um gerador de QR Code na tela do usuário logado atrelado ao seu CPF,
     utilizado para ser apresentado nos caixas das lojas físicas.

4. **Painel de Validação do Lojista (Web):**
   - Ferramenta web focada no momento do checkout: campo para digitar o CPF do
     cliente e botão/integração para leitura de QR Code.
   - Calculadora: Lojista digita o "Valor Total", o sistema aplica os "X% de
     Desconto da Loja" e exibe o desconto em reais para a finalização da
     transação.

5. **Painel de Backoffice (Administrativo):**
   - Listagem de moradores com status (Pendente, Aprovado, Rejeitado).
     Ferramenta para visualização das imagens dos documentos.
   - Gerenciamento do catálogo de lojistas (CRUD de lojas e serviços parceiros).

## User Experience

- **A Jornada do Morador:** Acessa um link no celular (Web App). Preenche os
  dados e faz upload de fotos (RG/Luz). Recebe uma mensagem na tela: "Seu
  cadastro está em análise pela equipe do bairro e será aprovado em até 1 dia
  útil." Após a aprovação (recebe e-mail), ele acessa a plataforma, descobre um
  restaurante com 15% de desconto. Vai ao restaurante. Na hora de pagar a conta,
  ele pega o celular, abre a sua "Carteirinha Digital" e mostra o QR Code ou
  fala seu CPF para o caixa.
- **A Jornada do Caixa da Loja:** O operador de caixa, em um computador comum,
  deixa o painel web do Passaporte aberto. O morador se identifica, o caixa
  digita o CPF. O sistema mostra: "João aprovado". O caixa digita que a compra
  deu R$ 100,00, o sistema avisa: "Desconto de 15% (R$ 15,00)". O caixa cobra R$
  85,00 no cartão e finaliza o registro.

## High-Level Technical Constraints

- **Formato:** O projeto não será um aplicativo nativo inicialmente, mas sim um
  **Web App (PWA)** otimizado primeiramente para dispositivos móveis
  (Mobile-first).
- **Sem Pagamentos no MVP:** O sistema não possuirá gateway de pagamento neste
  momento, nem para as assinaturas das lojas, nem para compras dentro do app.
  Todo pagamento de assinatura será faturado externamente, e toda compra do
  morador será paga fisicamente na loja.

## Non-Goals (Out of Scope)

- Marketplace: Compra e venda de produtos via e-commerce com entrega.
- Cashbacks monetários acumulados na plataforma (Beach Pay).
- Mural de Classificados, "Anuncie Aqui", ou Achados e Perdidos.
- Sistema de Orçamentos automatizado (o envio será feito redirecionando para o
  WhatsApp).

## Phased Rollout Plan

### MVP (Phase 1)

- Lançamento do Clube de Benefícios com validação manual de moradores.
- Cadastro de Lojistas pelo Backoffice.
- Painel Web para os Lojistas validarem as vendas.
- _Critério de Sucesso para Avançar:_ Atingir um volume X de validações mensais
  nas lojas comprovando que o hábito de abrir o Passaporte no caixa foi
  consolidado.

### Phase 2

- Adição de ferramentas de engajamento: Classificados comunitários e melhoria na
  listagem de serviços (link inteligente para WhatsApp).
- Notificações de promoções para os usuários (via Web Push).

### Phase 3

- Evolução do modelo para um Marketplace local completo, permitindo integração
  com carteiras digitais e pagamento pelo aplicativo (Beach Pay), gerando
  cashback transacional.

## Success Metrics

- Tempo médio de aprovação do morador (deve ser mantido em < 1 dia útil).
- Número de Moradores ativos aprovados e Lojistas cadastrados.
- **Métrica Norte (North Star):** Número de Validações de Desconto efetuadas nos
  caixas físicos mensalmente (Volume transacionado registrado).

## Risks and Mitigations

- **Risco de Fricção no Caixa:** O funcionário da loja pode não querer ou não
  saber usar o painel do Passaporte.
  - _Mitigação:_ A interface do lojista precisa ser extremamente rápida e
    aceitar digitação manual do CPF em letras grandes, reduzindo a dependência
    de escanear QR codes em computadores antigos sem webcam.
- **Risco de Abandono de Cadastro:** Usuários não terminarem o cadastro devido à
  barreira de envio de documentos.
  - _Mitigação:_ A página inicial que promove as marcas da região deve mostrar
    muito valor (exemplos reais de descontos em reais) antes de exigir os
    documentos.

## Architecture Decision Records

- [ADR-001: Foco no Clube de Benefícios via Web App](adrs/adr-001.md)

## Open Questions

- Os moradores podem adicionar familiares e dependentes no cadastro. Todos os
  membros da família usarão o mesmo CPF para desconto ou cada familiar terá que
  baixar o app e gerar seu próprio QR Code ligado ao cadastro principal?
- Será necessário que as lojas informem que tipo de produto foi consumido na
  hora da validação ou apenas o valor total da nota já é suficiente para este
  primeiro registro?
