import React, { useState } from 'react';
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

export const Pricing: React.FC = () => {
  const { session, profile, refreshProfile } = useAuth();
  const { credits } = useCredits(profile, refreshProfile);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!session) {
      // Redirect to login or show modal
      window.location.href = '/login'; 
      return;
    }

    if (planId === 'free') return; // Cannot upgrade to free manually usually

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

  return (
    <div className="py-12 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Planos e Preços
          </h2>
          <p className="mt-4 text-xl text-slate-300">
            Escolha o plano ideal para suas necessidades criativas.
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded text-red-500">
              {error}
            </div>
          )}
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`border rounded-lg shadow-sm divide-y divide-slate-700 bg-slate-800 flex flex-col ${plan.recommended ? 'border-indigo-500 ring-2 ring-indigo-500 relative' : 'border-slate-700'}`}>
              {plan.recommended && (
                <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-indigo-500 text-xs font-bold uppercase tracking-wide text-white rounded-full shadow-md">
                  Recomendado
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-white">{plan.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-base font-medium text-slate-400">/mês</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">{plan.credits} créditos</p>
                
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading !== null || plan.id === 'free'}
                  className={`mt-8 block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-center text-white 
                    ${plan.id === 'free' 
                      ? 'bg-slate-600 cursor-not-allowed opacity-70' 
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}
                    ${loading === plan.id ? 'opacity-75 cursor-wait' : ''}
                  `}
                >
                  {loading === plan.id ? 'Processando...' : (plan.id === 'free' ? 'Plano Atual' : 'Assinar Agora')}
                </button>
              </div>
              <div className="pt-6 pb-8 px-6 flex-1">
                <h4 className="text-sm font-medium text-slate-300 tracking-wide uppercase">O que está incluído</h4>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      {/* Icon placeholder - using emoji or simple svg if icons not avail */}
                      <svg className="flex-shrink-0 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
