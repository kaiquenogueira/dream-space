import React, { useState } from 'react';
import { SparkleIcon, LogOutIcon } from './Icons';
import { Property } from '../types';
import { useAuth, type UserProfile } from '../hooks/useAuth';
import SettingsModal from './SettingsModal';

interface HeaderProps {
  activeProperty: Property | undefined;
  setActivePropertyId: (id: string | null) => void;
  handleLogout: () => void;
  profile: UserProfile | null;
  onAdminClick?: () => void;
  isAdminView?: boolean;
  onPricingClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeProperty, setActivePropertyId, handleLogout, profile, onAdminClick, isAdminView, onPricingClick }) => {
  const { refreshProfile } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const creditPercent = profile
    ? (profile.credits_remaining / (profile.plan === 'free' ? 15 : profile.plan === 'starter' ? 100 : 400)) * 100
    : 0;

  return (
    <header className="sticky top-0 z-50 bg-glass backdrop-blur-2xl border-b border-glass-border shadow-lg shadow-black/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Left: Brand & Project */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setActivePropertyId(null)}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-sm"
          >
            <img src="/favicon.png" alt="IOLIA" className="w-9 h-9 rounded-sm shadow-lg shadow-secondary/30 group-hover:shadow-secondary/40 transition-all group-hover:scale-105" />
            <h1 className="text-xl font-semibold text-gradient hidden sm:block tracking-[0.35em] font-brand uppercase">
              IOLIA
            </h1>
          </button>

          <div className="h-7 w-px bg-glass-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-text-muted font-semibold leading-tight">Projeto</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-main text-sm max-w-[180px] truncate">{activeProperty?.name}</span>
                <button
                  onClick={() => setActivePropertyId(null)}
                  className="text-xs bg-surface hover:bg-surface-dark text-text-muted hover:text-white px-2.5 py-0.5 rounded-full transition-all border border-glass-border hover:border-text-muted focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Trocar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Credits + User + Logout */}
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          {profile && (
            <button
              onClick={onPricingClick}
              className="flex items-center gap-1.5 sm:gap-2 bg-surface/60 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-glass-border hover:border-primary/30 hover:bg-surface/80 transition-all cursor-pointer group"
              title="Ver planos e preços"
            >
              <div className="flex flex-col items-end">
                <span className="text-[11px] sm:text-xs font-semibold text-text-main leading-none">
                  {profile.credits_remaining} <span className="hidden sm:inline">créditos</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-text-muted capitalize mt-0.5">plano {profile.plan}</span>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 relative">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke="var(--color-surface)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke={creditPercent > 30 ? 'var(--color-primary)' : creditPercent > 10 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${creditPercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <SparkleIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              {profile.plan === 'free' && (
                <span className="hidden sm:inline text-[10px] font-semibold text-secondary group-hover:text-secondary-light transition-colors uppercase tracking-wider">
                  Upgrade
                </span>
              )}
            </button>
          )}

          {/* User info */}
          {profile && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-text-muted">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full border border-glass-border" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-text-muted text-[10px] font-bold uppercase border border-glass-border">
                  {(profile.full_name || profile.email)?.[0] || '?'}
                </div>
              )}
              <span className="max-w-[120px] truncate">{profile.full_name || profile.email}</span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Configurações da Imobiliária"
                className="ml-1 p-1.5 rounded-lg text-text-muted hover:text-white bg-surface hover:bg-surface-light border border-glass-border transition-all focus:outline-none focus:ring-1 focus:ring-secondary/50 group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-45 transition-transform duration-300">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          )}

          {profile?.is_admin && onAdminClick && (
            <button
              onClick={onAdminClick}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${isAdminView
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-surface/40 text-amber-500/80 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20'
                }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 14 4-4" />
                <path d="M3.34 19a10 10 0 1 1 17.32 0" />
              </svg>
              {isAdminView ? 'Voltar ao App' : 'Painel Admin'}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-medium text-text-muted hover:text-red-400 border border-glass-border hover:border-red-900/40 bg-glass hover:bg-red-950/20 px-3 py-1.5 rounded-xl transition-all group"
          >
            <LogOutIcon className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={refreshProfile}
      />
    </header>
  );
};

export default React.memo(Header);
