import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  credits: number;
  features: string[];
  recommended?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    credits: 15,
    features: [
      '15 créditos mensais',
      'Geração de imagens padrão',
      'Acesso básico à galeria',
      'Suporte comunitário'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 49',
    credits: 100,
    features: [
      '100 créditos mensais',
      'Geração de imagens em alta resolução',
      'Geração de vídeos curtos (2 vídeos)',
      'Suporte prioritário por email'
    ],
    recommended: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 149',
    credits: 400,
    features: [
      '400 créditos mensais',
      'Geração de vídeos (8 vídeos)',
      'Acesso antecipado a novos modelos',
      'Suporte VIP'
    ]
  }
];

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const { credits } = useCredits(profile, refreshProfile);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = profile?.plan || 'free';

  const handleUpgrade = async (planId: string) => {
    if (!session) {
      navigate('/login');
      return;
    }

    if (planId === 'free' || planId === currentPlan) return;

    setLoading(planId);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const getButtonLabel = (planId: string) => {
    if (loading === planId) return 'Processando...';
    if (planId === currentPlan) return '✓ Seu Plano Atual';
    if (planId === 'free') return 'Plano Gratuito';
    return 'Assinar Agora';
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-main transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar ao estúdio
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl text-text-main font-heading">
            Planos e Preços
          </h2>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades criativas.
          </p>
          {profile && (
            <p className="mt-2 text-sm text-text-muted">
              Plano atual: <span className="text-primary font-semibold capitalize">{currentPlan}</span> · {credits} créditos restantes
            </p>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm max-w-md mx-auto">
              {error}
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;

            return (
              <div
                key={plan.id}
                className={`rounded-xl border flex flex-col overflow-hidden transition-all duration-300 ${plan.recommended
                    ? 'border-primary/50 ring-2 ring-primary/30 shadow-lg shadow-primary/10 relative'
                    : isCurrentPlan
                      ? 'border-secondary/40 bg-surface/60'
                      : 'border-glass-border bg-surface/40 hover:border-glass-border/80'
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 -mt-0 -mr-0 px-4 py-1 bg-gradient-to-r from-primary to-primary/80 text-xs font-bold uppercase tracking-wide text-white rounded-bl-lg shadow-md">
                    Recomendado
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-lg leading-6 font-semibold text-text-main">{plan.name}</h3>
                  <p className="mt-4">
                    <span className="text-4xl font-extrabold text-text-main">{plan.price}</span>
                    <span className="text-base font-medium text-text-muted">/mês</span>
                  </p>
                  <p className="mt-1 text-sm text-text-muted">{plan.credits} créditos</p>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading !== null || isCurrentPlan || plan.id === 'free'}
                    className={`mt-6 block w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center transition-all duration-200
                      ${isCurrentPlan
                        ? 'bg-secondary/10 text-secondary border border-secondary/30 cursor-default'
                        : plan.id === 'free'
                          ? 'bg-surface text-text-muted border border-glass-border cursor-not-allowed opacity-60'
                          : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0'
                      }
                      ${loading === plan.id ? 'opacity-75 cursor-wait' : ''}
                    `}
                  >
                    {getButtonLabel(plan.id)}
                  </button>
                </div>

                <div className="pt-6 pb-8 px-6 flex-1 border-t border-glass-border/50">
                  <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase">O que está incluído</h4>
                  <ul className="mt-4 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <svg className="flex-shrink-0 h-4 w-4 mt-0.5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
