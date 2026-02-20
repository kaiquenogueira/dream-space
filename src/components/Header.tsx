import React from 'react';
import { LayoutIcon, SparkleIcon, LogOutIcon } from './Icons';
import { Property } from '../types';

interface HeaderProps {
  activeProperty: Property | undefined;
  setActivePropertyId: (id: string | null) => void;
  handleLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeProperty, setActivePropertyId, handleLogout }) => {
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
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold leading-tight">Project</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-200 text-sm max-w-[180px] truncate">{activeProperty?.name}</span>
                <button
                  onClick={() => setActivePropertyId(null)}
                  className="text-xs bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-400 hover:text-white px-2.5 py-0.5 rounded-full transition-all border border-zinc-700/50 hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-zinc-800/40 px-3 py-1.5 rounded-full border border-zinc-700/30">
            <SparkleIcon className="w-3.5 h-3.5 text-emerald-400/70" />
            powered by MKG
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-red-400 border border-zinc-800/60 hover:border-red-900/40 bg-zinc-900/50 hover:bg-red-950/20 px-3 py-1.5 rounded-xl transition-all group"
          >
            <LogOutIcon className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
