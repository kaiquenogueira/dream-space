import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/* ─── Animated Counter ─── */
const Counter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const observed = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !observed.current) {
                observed.current = true;
                const start = performance.now();
                const animate = (now: number) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(eased * end));
                    if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.5 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── Scroll-reveal wrapper ─── */
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); }
        }, { threshold: 0.15 });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    );
};

/* ─── FAQ Item ─── */
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-white/5">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left group"
            >
                <span className="text-base font-medium text-text-main group-hover:text-secondary transition-colors pr-4">{q}</span>
                <svg
                    className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open ? '200px' : '0', opacity: open ? 1 : 0 }}
            >
                <p className="pb-5 text-sm text-text-muted leading-relaxed">{a}</p>
            </div>
        </div>
    );
};


const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const FEATURES = [
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
            ),
            title: 'Staging Virtual',
            desc: 'Mobilie ambientes vazios instantaneamente com móveis e decoração fotorrealistas. Ideal para imóveis à venda.',
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <path d="M12 12h.01" />
                    <path d="M17 12h.01" />
                    <path d="M7 12h.01" />
                </svg>
            ),
            title: 'Staging Virtual',
            desc: 'Mobilie ambientes vazios instantaneamente. Ideal para imóveis à venda — sem custo de móveis físicos, sem logística.',
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h18v18H3z" />
                    <path d="m12 8-2 4h4l-2 4" />
                </svg>
            ),
            title: 'Pintura Inteligente',
            desc: 'Simule cores e texturas de parede em tempo real. Teste dezenas de combinações sem abrir uma lata de tinta.',
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                </svg>
            ),
            title: 'Tour Drone em Vídeo',
            desc: 'Gere vídeos cinematográficos dos seus ambientes redesenhados. Perfeito para redes sociais e apresentações.',
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
            ),
            title: 'Antes e Depois',
            desc: 'Compare o original com o resultado gerado lado a lado com slider interativo. Impressione seus clientes.',
        },
        {
            icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            ),
            title: 'Download em Alta Resolução',
            desc: 'Baixe imagens originais, geradas ou comparações com marca d\'água da sua empresa. Pacote ZIP em 1 clique.',
        },
    ];

    const PLANS = [
        { name: 'Free', price: 'R$ 0', period: '/mês', credits: '15 créditos', features: ['Geração de imagens padrão', 'Acesso básico à galeria', 'Suporte comunitário'], cta: 'Começar Grátis', popular: false },
        { name: 'Starter', price: 'R$ 49', period: '/mês', credits: '100 créditos', features: ['Imagens em alta resolução', 'Geração de vídeos (2/mês)', 'Suporte prioritário'], cta: 'Assinar Starter', popular: true },
        { name: 'Pro', price: 'R$ 149', period: '/mês', credits: '400 créditos', features: ['Geração de vídeos (8/mês)', 'Acesso antecipado a novos modelos', 'Suporte VIP'], cta: 'Assinar Pro', popular: false },
    ];

    const TESTIMONIALS = [
        { name: 'Juliana C.', role: 'Corretora de Imóveis', text: 'O IOLIA transformou completamente a forma como apresento imóveis. Meus clientes ficam impressionados com as visualizações antes mesmo da visita.' },
        { name: 'Ricardo M.', role: 'Arquiteto', text: 'A qualidade das imagens geradas é impressionante. Uso para apresentar propostas aos clientes e agilizar o processo de aprovação de projetos.' },
        { name: 'Ana P.', role: 'Designer de Interiores', text: 'O staging virtual me poupa horas de trabalho. Em vez de montar moodboards complexos, gero visualizações realistas em minutos.' },
    ];

    const FAQS = [
        { q: 'Preciso de conhecimento técnico para usar?', a: 'Não! O IOLIA foi desenhado para ser intuitivo. Basta fazer upload de uma foto, escolher o estilo desejado e clicar em gerar. A IA faz todo o trabalho pesado.' },
        { q: 'Quanto tempo leva para gerar uma imagem?', a: 'Cada imagem é gerada em aproximadamente 10-30 segundos, dependendo da complexidade do estilo escolhido. Vídeos de drone tour levam cerca de 1-2 minutos.' },
        { q: 'Posso usar as imagens comercialmente?', a: 'Sim! Todas as imagens geradas no IOLIA são de uso livre para fins comerciais, incluindo catálogos, anúncios e redes sociais.' },
        { q: 'O que acontece quando meus créditos acabam?', a: 'Você pode fazer upgrade a qualquer momento para um plano com mais créditos. Seus créditos são renovados mensalmente conforme seu plano ativo.' },
    ];

    return (
        <div className="min-h-screen bg-primary-dark text-text-main font-sans overflow-x-hidden">

            {/* ═══════════ NAVBAR ═══════════ */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-primary-dark/95 backdrop-blur-xl border-b border-glass-border shadow-2xl' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="IOLIA" className="w-8 h-8 rounded-sm shadow-lg shadow-secondary/30" />
                        <span className="text-lg font-semibold font-brand tracking-[0.35em] text-gradient uppercase">IOLIA</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm text-text-muted">
                        <a href="#features" className="hover:text-secondary transition-colors">Recursos</a>
                        <a href="#how-it-works" className="hover:text-secondary transition-colors">Como Funciona</a>
                        <a href="#pricing" className="hover:text-secondary transition-colors">Planos</a>
                        <a href="#faq" className="hover:text-secondary transition-colors">FAQ</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
                            className="text-sm text-text-muted hover:text-text-main transition-colors hidden sm:block"
                        >
                            {isAuthenticated ? 'Ir para o App' : 'Entrar'}
                        </button>
                        <button
                            onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
                            className="btn-primary text-xs py-2 px-4"
                        >
                            {isAuthenticated ? 'Novo Projeto' : 'Começar Grátis'}
                        </button>
                    </div>
                </div>
            </nav>


            {/* ═══════════ HERO ═══════════ */}
            <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
                {/* Background orbs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-[15%] -left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px]"
                        style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent 70%)', animation: 'orbFloat1 20s ease-in-out infinite' }} />
                    <div className="absolute -bottom-[15%] -right-[10%] w-[700px] h-[700px] rounded-full opacity-[0.03] blur-[140px]"
                        style={{ background: 'radial-gradient(circle, var(--color-secondary-light), transparent 70%)', animation: 'orbFloat2 25s ease-in-out infinite' }} />
                    <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[100px]"
                        style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent 70%)', animation: 'orbFloat3 18s ease-in-out infinite' }} />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(rgba(211,156,118,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(211,156,118,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Copy */}
                        <div className="text-center lg:text-left">


                            <Reveal delay={100}>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-[1.1] tracking-tight mb-6">
                                    Transforme Espaços com
                                    <span className="block text-gradient mt-1">Inteligência Artificial</span>
                                </h1>
                            </Reveal>

                            <Reveal delay={200}>
                                <p className="text-lg text-text-muted max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                                    Staging virtual, pintura inteligente e iteração incremental.
                                    Crie visualizações de tirar o fôlego em segundos — sem fotógrafos, sem renderização 3D.
                                </p>
                            </Reveal>

                            <Reveal delay={300}>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <button
                                        onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
                                        className="btn-primary text-sm py-3.5 px-8 shadow-xl shadow-secondary/30"
                                    >
                                        {isAuthenticated ? 'Ir para o App' : 'Começar Grátis — 15 créditos'}
                                    </button>
                                    <a
                                        href="#how-it-works"
                                        className="btn-secondary text-sm py-3.5 px-8"
                                    >
                                        Veja Como Funciona
                                    </a>
                                </div>
                            </Reveal>

                            <Reveal delay={400}>
                                <div className="mt-10 flex items-center gap-8 justify-center lg:justify-start text-text-muted">
                                    <div className="flex flex-col items-center lg:items-start">
                                        <span className="text-2xl font-bold text-text-main font-heading"><Counter end={8} /> estilos</span>
                                        <span className="text-xs">arquitetônicos</span>
                                    </div>
                                    <div className="h-8 w-px bg-glass-border" />
                                    <div className="flex flex-col items-center lg:items-start">
                                        <span className="text-2xl font-bold text-text-main font-heading"><Counter end={2} /> modos</span>
                                        <span className="text-xs">de geração</span>
                                    </div>
                                    <div className="h-8 w-px bg-glass-border" />
                                    <div className="flex flex-col items-center lg:items-start">
                                        <span className="text-2xl font-bold text-text-main font-heading">~<Counter end={10} />s</span>
                                        <span className="text-xs">por imagem</span>
                                    </div>
                                </div>
                            </Reveal>
                        </div>

                        {/* Right: Hero Image */}
                        <Reveal delay={200} className="relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-glass-border group">
                                <img
                                    src="/landing/hero.png"
                                    alt="Transformação de interior com IA — antes e depois"
                                    className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.02]"
                                    loading="eager"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/60 via-transparent to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <span className="bg-primary-dark/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-text-muted border border-glass-border">
                                        IA Generativa
                                    </span>
                                </div>
                            </div>
                            {/* Glow behind */}
                            <div className="absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl bg-gradient-to-br from-secondary/20 to-transparent" />
                        </Reveal>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted">Explore</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </section>


            {/* ═══════════ FEATURES ═══════════ */}
            <section id="features" className="py-24 lg:py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">Recursos</span>
                            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
                                Tudo que você precisa para<br /><span className="text-gradient">vender mais imóveis</span>
                            </h2>
                            <p className="text-text-muted max-w-2xl mx-auto">
                                Do upload à apresentação final, o IOLIA cobre todo o fluxo de marketing imobiliário com IA de ponta.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <Reveal key={i} delay={i * 80}>
                                <div className="group relative bg-surface/40 border border-glass-border rounded-2xl p-7 hover:border-secondary/30 hover:bg-surface/60 transition-all duration-300 h-full">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-secondary/20 transition-all">
                                            {f.icon}
                                        </div>
                                        <h3 className="text-lg font-semibold text-text-main mb-2 font-heading">{f.title}</h3>
                                        <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ SHOWCASE: STYLES ═══════════ */}
            <section className="py-24 lg:py-32 bg-surface/30 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(rgba(211,156,118,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(211,156,118,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <Reveal>
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-glass-border">
                                <img src="/landing/styles.png" alt="8 estilos arquitetônicos disponíveis" className="w-full h-auto" loading="lazy" />
                            </div>
                        </Reveal>
                        <Reveal delay={150}>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">8 Estilos</span>
                                <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6">
                                    Do Minimalista ao Boêmio.<br /><span className="text-gradient">Escolha. Gere. Encante.</span>
                                </h2>
                                <p className="text-text-muted mb-8 leading-relaxed">
                                    Cada estilo foi treinado com milhares de referências de design de interiores de alta qualidade.
                                    Moderno, Escandinavo, Industrial, Boêmio, Minimalista, Mid-Century, Costeiro e Casa de Fazenda.
                                </p>
                                <ul className="space-y-3">
                                    {['Moderno', 'Escandinavo', 'Industrial', 'Boêmio', 'Minimalista', 'Mid-Century', 'Costeiro', 'Fazenda'].map((s, i) => (
                                        <li key={s} className="flex items-center gap-3 text-sm text-text-muted">
                                            <div className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>


            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section id="how-it-works" className="py-24 lg:py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">Como Funciona</span>
                            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
                                <span className="text-gradient">3 passos simples</span> para transformar qualquer ambiente
                            </h2>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                        {[
                            { step: '01', title: 'Faça Upload', desc: 'Envie até 10 fotos do ambiente que deseja transformar. Aceita JPG, PNG e WEBP.' },
                            { step: '02', title: 'Escolha o Estilo', desc: 'Selecione o modo (Staging ou Pintura), o estilo arquitetônico e personalize o prompt.' },
                            { step: '03', title: 'Gere e Baixe', desc: 'A IA gera o resultado em segundos. Compare, ajuste e baixe em alta resolução.' },
                        ].map((item, i) => (
                            <Reveal key={i} delay={i * 120}>
                                <div className="text-center group">
                                    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 border border-secondary/20 mb-6 group-hover:scale-110 transition-transform">
                                        <span className="text-2xl font-heading font-bold text-secondary">{item.step}</span>
                                        {i < 2 && (
                                            <div className="hidden md:block absolute -right-[calc(50%+1rem)] top-1/2 w-[calc(100%+2rem)] border-t border-dashed border-glass-border" />
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold font-heading mb-3">{item.title}</h3>
                                    <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ STAGING SHOWCASE ═══════════ */}
            <section className="py-24 lg:py-32 bg-surface/30 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <Reveal delay={100}>
                            <div className="order-2 lg:order-1">
                                <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">Staging Virtual</span>
                                <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6">
                                    Ambientes vazios?<br /><span className="text-gradient">A IA mobilia para você.</span>
                                </h2>
                                <p className="text-text-muted mb-8 leading-relaxed">
                                    Esqueça o custo e logística de mobiliar fisicamente um imóvel para fotos.
                                    O IOLIA preenche espaços vazios com móveis e decoração fotorrealistas, alinhados ao estilo que seu cliente espera.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { val: '90%', label: 'Menos custo vs staging físico' },
                                        { val: '< 30s', label: 'Tempo de geração' },
                                        { val: '8', label: 'Estilos disponíveis' },
                                        { val: '∞', label: 'Variações possíveis' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-surface/60 border border-glass-border rounded-xl p-4 text-center">
                                            <span className="text-xl font-bold text-secondary font-heading block">{s.val}</span>
                                            <span className="text-[11px] text-text-muted">{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                        <Reveal className="order-1 lg:order-2">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-glass-border">
                                <img src="/landing/staging.png" alt="Staging virtual com IA" className="w-full h-auto" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/40 via-transparent to-transparent" />
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>


            {/* ═══════════ TESTIMONIALS ═══════════ */}
            <section className="py-24 lg:py-32 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">Depoimentos</span>
                            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
                                Quem usa, <span className="text-gradient">recomenda</span>
                            </h2>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <Reveal key={i} delay={i * 100}>
                                <div className="bg-surface/40 border border-glass-border rounded-2xl p-7 hover:border-secondary/20 transition-all h-full flex flex-col">
                                    <div className="flex items-center gap-1 mb-4">
                                        {[...Array(5)].map((_, j) => (
                                            <svg key={j} className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-sm text-text-muted leading-relaxed flex-1 italic">"{t.text}"</p>
                                    <div className="mt-5 flex items-center gap-3 pt-5 border-t border-glass-border">
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">{t.name[0]}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-text-main">{t.name}</p>
                                            <p className="text-xs text-text-muted">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ PRICING ═══════════ */}
            <section id="pricing" className="py-24 lg:py-32 bg-surface/30 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">Planos</span>
                            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
                                Comece grátis. <span className="text-gradient">Escale quando quiser.</span>
                            </h2>
                            <p className="text-text-muted">Cancele a qualquer momento. Sem surpresas.</p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-6 lg:max-w-4xl lg:mx-auto">
                        {PLANS.map((plan, i) => (
                            <Reveal key={i} delay={i * 100}>
                                <div className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 h-full ${plan.popular ? 'border-secondary/40 ring-2 ring-secondary/20 shadow-xl shadow-secondary/10' : 'border-glass-border bg-surface/40'}`}>
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-secondary to-secondary-light text-xs font-bold uppercase tracking-wide text-primary-dark rounded-bl-xl">
                                            Popular
                                        </div>
                                    )}
                                    <div className="p-7">
                                        <h3 className="text-lg font-semibold font-heading text-text-main">{plan.name}</h3>
                                        <p className="mt-4">
                                            <span className="text-4xl font-extrabold text-text-main font-heading">{plan.price}</span>
                                            <span className="text-sm text-text-muted">{plan.period}</span>
                                        </p>
                                        <p className="mt-1 text-sm text-secondary font-medium">{plan.credits}</p>
                                        <button
                                            onClick={() => navigate(isAuthenticated ? '/app/pricing' : '/login')}
                                            className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${plan.popular
                                                ? 'bg-gradient-to-r from-secondary to-secondary-light text-primary-dark hover:shadow-lg hover:shadow-secondary/30 hover:-translate-y-0.5'
                                                : 'bg-surface border border-glass-border text-text-main hover:border-secondary/30 hover:bg-surface-light'
                                                }`}
                                        >
                                            {plan.cta}
                                        </button>
                                    </div>
                                    <div className="px-7 pb-7 pt-5 flex-1 border-t border-glass-border/50">
                                        <ul className="space-y-3">
                                            {plan.features.map((f) => (
                                                <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                                                    <svg className="flex-shrink-0 h-4 w-4 mt-0.5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════ FAQ ═══════════ */}
            <section id="faq" className="py-24 lg:py-32 relative">
                <div className="max-w-3xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-12">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-4 block">FAQ</span>
                            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
                                Perguntas <span className="text-gradient">Frequentes</span>
                            </h2>
                        </div>
                    </Reveal>
                    <Reveal delay={100}>
                        <div className="bg-surface/40 border border-glass-border rounded-2xl px-7">
                            {FAQS.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
                        </div>
                    </Reveal>
                </div>
            </section>


            {/* ═══════════ FINAL CTA ═══════════ */}
            <section className="py-24 lg:py-32 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06] blur-[150px]"
                        style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent 60%)' }} />
                </div>
                <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
                    <Reveal>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-6 leading-tight">
                            Pronto para transformar<br />
                            <span className="text-gradient">seus projetos?</span>
                        </h2>
                        <p className="text-lg text-text-muted mb-10 max-w-xl mx-auto">
                            Crie sua conta gratuita e comece a gerar visualizações impressionantes hoje mesmo.
                        </p>
                        <button
                            onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
                            className="btn-primary text-sm py-4 px-10 shadow-xl shadow-secondary/30"
                        >
                            {isAuthenticated ? 'Ir para o App' : 'Criar Conta Grátis'}
                        </button>
                        <p className="mt-4 text-xs text-text-muted">Sem cartão de crédito. 15 créditos grátis para começar.</p>
                    </Reveal>
                </div>
            </section>


            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="border-t border-glass-border py-12 bg-surface/20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <img src="/favicon.png" alt="IOLIA" className="w-7 h-7 rounded-sm" />
                            <span className="font-brand font-semibold text-sm text-gradient tracking-[0.35em] uppercase">IOLIA</span>
                            <span className="text-[10px] uppercase tracking-widest text-text-muted ml-1">AI Architecture & Design</span>
                        </div>
                        <p className="text-xs text-text-muted">
                            © {new Date().getFullYear()} IOLIA AI. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
