# Relatório de Lançamento e Validação de Mercado: Iolia AI (Dream Space)

Como especialista em lançamento e marketing de performance (Growth), analisei o contexto da sua aplicação. Sabemos que se trata de uma ferramenta SaaS de Inteligência Artificial para geração de imagens e vídeos (preservação estrutural de ambientes/arquitetura), com um modelo *Freemium* (15 créditos grátis) e planos pagos (Starter a R$49 e Pro a R$149).

*Nota técnica inicial:* Quando você menciona "Adsense", acredito que esteja se referindo ao **Google Ads** (comprar anúncios no Google) ou **Meta Ads** (Facebook/Instagram). O *Google AdSense* é a plataforma para você *receber* dinheiro exibindo anúncios de terceiros no seu site. Para validar sua ideia, usaremos **Tráfego Pago (Google Ads e Meta Ads)**.

Abaixo, apresento o plano estratégico de como estruturar, o que testar e quanto investir para validar essa ideia com risco controlado.

---

## 1. O Que Testar (Estratégia de Validação)

Sua aplicação tem um apelo altamente **visual** e resolve um problema claro de **visualização de projetos**. Precisamos testar duas vertentes principais:

**A. Validação de Público (Quem compra?)**
Não assuma quem é o seu melhor cliente. Teste os dois extremos:
1.  **B2B (Profissionais):** Arquitetos, Designers de Interiores, Corretores de Imóveis e Marceneiros. (Eles buscam produtividade e impressionar clientes).
2.  **B2C (Consumidor Final):** Pessoas que estão reformando ou construindo a casa própria. (Eles buscam inspiração e previsibilidade).

**B. Validação de Ângulo de Venda (Copy/Criativo)**
O que faz a pessoa clicar e testar a ferramenta?
*   **Ângulo 1 (Tempo/Dinheiro):** "Crie projetos de interiores realistas em segundos, não em dias. Economize com renderizações caras."
*   **Ângulo 2 (Transformação Mágica):** "Veja como sua sala velha pode ficar com um design moderno. Faça o upload de uma foto e descubra." (Forte para B2C e Meta Ads).
*   **Ângulo 3 (Tecnologia/Controle):** "A única IA que preserva a estrutura original do seu ambiente (sem alterar paredes e janelas)." (Baseado no seu diferencial técnico de preservação estrutural).

---

## 2. Onde Testar (Canais de Aquisição)

Para essa validação, divida o foco em duas plataformas, pois elas capturam momentos diferentes do usuário:

*   **Google Ads (Rede de Pesquisa):** Tráfego de *intenção*. A pessoa já está procurando a solução.
    *   *Palavras-chave alvo:* "app para simular reforma", "ia para arquitetura", "renderizar projeto online", "simulador de decoração".
*   **Meta Ads (Instagram/Facebook):** Tráfego de *atenção/descoberta*. Como seu produto é visual, o Instagram é uma mina de ouro.
    *   *Formato:* Vídeos de "Antes e Depois" (A foto original do cômodo se transformando em um render 3D realista usando a ferramenta).

---

## 3. Quanto Testar (Orçamento e Cronograma)

A validação não precisa ser cara, mas precisa comprar dados suficientes para ter significância estatística.

**Fase 1: O Teste de Validação (10 a 14 Dias)**
*   **Orçamento Diário Recomendado:** R$ 60 a R$ 100 por dia (R$ 30-50 no Google, R$ 30-50 no Meta).
*   **Investimento Total do Teste:** ~R$ 1.000 a R$ 1.400.
*   **Objetivo da Fase 1:** Comprar dados. Não espere lucro imediato. O objetivo é descobrir qual público clica mais barato e qual converte no cadastro gratuito (Lead).

**Métricas de Sucesso Esperadas (Benchmarks para SaaS no Brasil):**
1.  **CPC (Custo por Clique):** R$ 0,80 a R$ 2,50.
2.  **CPA Free (Custo por Cadastro no Plano Grátis de 15 créditos):** R$ 3,00 a R$ 8,00.
3.  **Taxa de Conversão da Landing Page:** 15% a 30% dos cliques devem virar cadastros grátis.
4.  **Taxa de Upgrade (Free para R$ 49):** 2% a 5%.

*Matemática da Validação:*
Se você gastar R$ 1.000 e conseguir um CPA de R$ 5,00, você terá **200 usuários testando sua ferramenta**.
Se a sua taxa de upgrade for de 3%, você fará **6 vendas do plano Starter (R$ 49)** = R$ 294 de receita.
*Por que isso é bom?* Porque SaaS tem receita recorrente (LTV - Life Time Value). Se o cliente ficar 6 meses, a receita gerada foi de R$ 1.764, pagando o custo de aquisição (CAC).

---

## 4. Plano de Ação Prático (Checklist de Lançamento)

Para não queimar dinheiro, certifique-se de ter esses 4 itens prontos antes de ligar as campanhas:

1.  **Tracking Impecável:** O Pixel do Meta e a Tag do Google Ads precisam estar instalados e disparando nos eventos `sign_up` (quando o usuário cria a conta) e `purchase` (quando o webhook do Stripe confirma a assinatura).
2.  **Landing Page Focada:** A primeira página não pode ser o dashboard do app. Deve ser uma página de vendas simples, mostrando um vídeo rápido da ferramenta funcionando, o benefício principal e um botão gigante: *"Teste Grátis agora (15 créditos)"*.
3.  **Estratégia de Retenção (A Mágica do Freemium):** O usuário ganha 15 créditos. A geração de imagem custa 1 crédito. Certifique-se de que a *primeira* geração dele seja incrível. Se a primeira imagem for ruim, ele não compra.
4.  **Onboarding de E-mail (Opcional, mas recomendado):** Enviar um e-mail 2 dias após o cadastro com um cupom de 20% de desconto no plano Starter ou mostrando exemplos de prompts avançados.

---

### Resumo do Especialista:
**Não gaste muito de uma vez.** Coloque R$ 100 por dia, deixe rodar por 3 dias sem mexer (para a IA do Google/Meta aprender). No 4º dia, pause os anúncios ou palavras-chave que estão gastando dinheiro e não estão gerando cadastros. A ideia está validada no momento em que estranhos começarem a colocar o cartão de crédito para assinar o plano de R$ 49, provando que o problema que você resolve dói o suficiente para pagarem por ele.