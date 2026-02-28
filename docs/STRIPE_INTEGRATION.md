# Stripe Integration Guide — DreamSpace SaaS

> **Status**: Documentado e pronto para implementação futura.
> Implementar quando houver ~10-20 usuários ativos pedindo planos pagos.

## Pré-requisitos

1. Criar conta no [Stripe](https://stripe.com)
2. Obter **Publishable Key** e **Secret Key** do Dashboard
3. Configurar env vars:

```env
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Planos Sugeridos (Baseado em Custo Real - Fev/2026)

> **Base de Custo:**
> - Imagem (Imagen 3/Gemini Flash): ~$0.04 USD/img
> - Vídeo (Veo - 5s): ~$1.75 USD/vídeo (Alto custo!)
> - Cotação Dólar: ~R$ 5.80

| Plano | Preço (R$) | Créditos | Custo Aprox. (USD) | Margem Estimada |
|---|---|---|---|---|
| **Free** | R$ 0 | 15 | $0.60 | Investimento (CAC) |
| **Starter** | R$ 49 | 100 | $4.00 | ~53% |
| **Pro** | R$ 149 | 400 | $16.00 | ~38% |
| **Enterprise**| Sob Consulta | Ilimitado* | Variável | N/A |

## Sistema de Consumo de Créditos

| Ação | Custo em Créditos | Custo Real Est. (USD) |
|---|---|---|
| Gerar Imagem (Standard) | 1 Crédito | $0.04 |
| Gerar Imagem (High Res) | 2 Créditos | $0.08 |
| Gerar Vídeo (5s) | 50 Créditos | $1.75 - $2.00 |
| Upscale / Edit | 1 Crédito | $0.04 |

## Arquitetura

```
[Frontend]                    [Backend]
Pricing Page                  /api/stripe/checkout
  → "Upgrade" click ───────→  → cria Stripe Checkout Session
  → redirect Stripe           → retorna URL
                              
Stripe Checkout               /api/stripe/webhook
  → pagamento OK ───────────→ → event: checkout.session.completed
                                → atualiza profiles.plan
                                → atualiza profiles.credits_remaining
                              
User Settings                 /api/stripe/portal
  → "Manage billing" ──────→  → cria Stripe Billing Portal Session
  → redirect portal           → retorna URL
```

## Endpoints Necessários

### 1. `/api/stripe/checkout.ts`

```typescript
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  starter: 'price_starter_xxx', // criar no Stripe Dashboard
  pro: 'price_pro_xxx',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  // Auth check (copiar padrão do generate.ts)
  const token = req.headers.authorization?.split(' ')[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { plan } = req.body;
  const priceId = PRICE_IDS[plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${req.headers.origin}/?checkout=success`,
    cancel_url: `${req.headers.origin}/?checkout=cancel`,
    metadata: { userId: user.id, plan },
  });

  return res.status(200).json({ url: session.url });
}
```

### 2. `/api/stripe/webhook.ts`

```typescript
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  pro: 400,
};

export default async function handler(req: any, res: any) {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // Para Vercel, usar raw body
    event = stripe.webhooks.constructEvent(
      req.body, // precisa ser raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        await supabaseAdmin.from('profiles').update({
          plan,
          credits_remaining: PLAN_CREDITS[plan] || 5,
          credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', userId);
      }
      break;
    }
    case 'invoice.paid': {
      // Renovação mensal
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const userId = subscription.metadata?.userId;
      const plan = subscription.metadata?.plan;

      if (userId && plan) {
        await supabaseAdmin.from('profiles').update({
          credits_remaining: PLAN_CREDITS[plan] || 5,
          credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', userId);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      // Downgrade para free
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;

      if (userId) {
        await supabaseAdmin.from('profiles').update({
          plan: 'free',
          credits_remaining: 5,
        }).eq('id', userId);
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
}
```

### 3. `/api/stripe/portal.ts`

```typescript
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.split(' ')[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Buscar customer do Stripe pelo email
  const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
  if (customers.data.length === 0) {
    return res.status(404).json({ error: 'No Stripe customer found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id,
    return_url: req.headers.origin,
  });

  return res.status(200).json({ url: session.url });
}
```

## Frontend: Pricing Page

Criar componente `src/components/Pricing.tsx` com 3 cards (Free, Starter, Pro). O botão "Upgrade" chama `/api/stripe/checkout` e redireciona para o Stripe Checkout.

## Checklist de Implementação

- [ ] Instalar `stripe` no backend: `npm install stripe`
- [ ] Criar produtos e preços no Stripe Dashboard
- [ ] Criar os 3 endpoints acima
- [ ] Configurar webhook no Stripe Dashboard apontando para `/api/stripe/webhook`
- [ ] Criar componente de Pricing
- [ ] Testar com Stripe Test Mode
- [ ] Ativar modo Live quando pronto
