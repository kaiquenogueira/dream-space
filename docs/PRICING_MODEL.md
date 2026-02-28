# Modelo de Precificação e Custos — Dream Space

> **Última Atualização:** Fevereiro 2026
> **Status:** Implementado (V1)

Este documento detalha a estrutura de custos, margens e limites definidos para garantir a sustentabilidade econômica do projeto.

## 1. Estrutura de Custos (Base)

Os custos são calculados com base nas APIs do Google (Gemini/Vertex AI) e infraestrutura serverless.

| Recurso | Modelo Técnico | Custo Unitário (Est.) |
| :--- | :--- | :--- |
| **Geração de Imagem** | Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) | ~$0.039 USD / imagem (*) |
| **Geração de Vídeo** | Veo (`veo-2.0-generate-001`) | ~$1.75 USD / 5s vídeo |
| **Storage** | Supabase Storage | Marginal (incluído no plano) |
| **Bandwidth** | Vercel / Supabase | Marginal (até limites do tier) |

> **(*) Detalhes do custo de imagem:** Output a $30/1M tokens. Imagens até 1024×1024px consomem 1.290 tokens = ~$0.039/imagem. Há custo adicional marginal de tokens de input (texto + imagem de referência).

> **Nota:** O custo de vídeo é significativamente alto (~43x o custo de uma imagem), exigindo uma taxa de queima de créditos proporcional.

## 2. Tabela de Planos

| Plano | Preço Mensal (BRL) | Créditos Mensais | Custo Máx. (USD) | Margem Bruta (Est.) |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | R$ 0,00 | **15** | $0.60 | (CAC / Marketing) |
| **Starter** | R$ 49,00 | **100** | $4.00 | **~53%** |
| **Pro** | R$ 149,00 | **400** | $16.00 | **~38%** |

*Cotação ref: USD 1.00 = BRL 5.80*

## 3. Regras de Consumo de Créditos

O sistema de créditos abstrai a complexidade do custo real para o usuário.

| Ação | Consumo | Equivalência (Free) | Equivalência (Starter) |
| :--- | :--- | :--- | :--- |
| **Gerar Imagem** | **1 Crédito** | 15 imgs/mês | 100 imgs/mês |
| **Gerar Vídeo (Drone Tour)** | **50 Créditos** | *Indisponível* | 2 vídeos/mês |
| **Upscale (Futuro)** | **1 Crédito** | - | - |

### Justificativa do Peso para Vídeo
Um vídeo custa ~$1.75. Com o plano Starter a R$49 (~$8.45 USD), permitir vídeos a 1 crédito quebraria o caixa (o usuário poderia gerar 100 vídeos custando $175 USD).
Com o peso de **50 créditos**:
- Custo p/ usuário (em créditos): 50
- Custo p/ empresa: $1.75
- Receita (Starter) por 50 créditos: ~$4.22
- **Resultado:** A operação se mantém lucrativa.

## 4. Implementação Técnica

### Backend (API)
- **Imagens:** `POST /api/generate` -> Desconta `1` crédito.
- **Vídeos:** `POST /api/drone-tour` (ou similar) -> Deve descontar `50` créditos.

### Frontend
- Exibir alertas claros antes de ações de alto custo (Vídeo).
- Bloquear ações se `credits < cost`.

## 5. Próximos Passos (Roadmap de Pricing)
1. Implementar Webhooks do Stripe para renovação automática.
2. Criar painel de uso para o usuário ver onde gastou.
3. Avaliar pacotes avulsos de créditos (Add-ons).
