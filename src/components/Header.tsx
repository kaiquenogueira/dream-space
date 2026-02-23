import React from 'react';
import { LayoutIcon, SparkleIcon, LogOutIcon } from './Icons';
import { Property } from '../types';
import type { UserProfile } from '../hooks/useAuth';

interface HeaderProps {
  activeProperty: Property | undefined;
  setActivePropertyId: (id: string | null) => void;
  handleLogout: () => void;
  profile: UserProfile | null;
  onAdminClick?: () => void;
  isAdminView?: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeProperty, setActivePropertyId, handleLogout, profile, onAdminClick, isAdminView }) => {
  const creditPercent = profile
    ? (profile.credits_remaining / (profile.plan === 'free' ? 5 : profile.plan === 'starter' ? 50 : 200)) * 100
    : 0;

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/60 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Left: Brand & Project */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setActivePropertyId(null)}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 group-hover:shadow-emerald-600/40 transition-all group-hover:scale-105">
              <LayoutIcon className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-gradient hidden sm:block tracking-tight">
              DreamSpace
            </h1>
          </button>

          <div className="h-7 w-px bg-zinc-800/60 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold leading-tight">Projeto</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-200 text-sm max-w-[180px] truncate">{activeProperty?.name}</span>
                <button
                  onClick={() => setActivePropertyId(null)}
                  className="text-xs bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white px-2.5 py-0.5 rounded-full transition-all border border-zinc-700/50 hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
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
            <div className="hidden md:flex items-center gap-2 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800/40">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-zinc-300">
                  {profile.credits_remaining} créditos
                </span>
                <span className="text-[10px] text-zinc-500 capitalize">plano {profile.plan}</span>
              </div>
              <div className="w-8 h-8 relative">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke={creditPercent > 30 ? '#10b981' : creditPercent > 10 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${creditPercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <SparkleIcon className="w-3.5 h-3.5 text-emerald-400/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* User info */}
          {profile && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] font-bold uppercase">
                  {(profile.full_name || profile.email)?.[0] || '?'}
                </div>
              )}
              <span className="max-w-[120px] truncate">{profile.full_name || profile.email}</span>
            </div>
          )}

          {profile?.is_admin && onAdminClick && (
            <button
              onClick={onAdminClick}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${isAdminView
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-zinc-800/40 text-amber-500/80 border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20'
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
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-red-400 border border-zinc-800/60 hover:border-red-900/40 bg-zinc-900/50 hover:bg-red-950/20 px-3 py-1.5 rounded-xl transition-all group"
          >
            <LogOutIcon className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
