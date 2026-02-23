import React, { useState } from 'react';
import { LayoutIcon, SparkleIcon, MapPinIcon, FolderIcon } from './Icons';
import { Property } from '../types';

interface PropertyCreationProps {
  properties: Property[];
  setActivePropertyId: (id: string) => void;
  handleCreateProperty: (e: React.FormEvent, name: string) => void;
}

const PropertyCreation: React.FC<PropertyCreationProps> = ({ properties, setActivePropertyId, handleCreateProperty }) => {
  const [newPropertyName, setNewPropertyName] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateProperty(e, newPropertyName);
    setNewPropertyName('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
            animation: 'orbFloat1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-48 -right-32 w-[600px] h-[600px] rounded-full opacity-15 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
            animation: 'orbFloat2 25s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md opacity-0 animate-fade-slide-in">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-5 shadow-lg shadow-emerald-500/25 animate-glow-pulse">
            <LayoutIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2 tracking-tight">
            DreamSpace AI
          </h1>
          <p className="text-zinc-400 text-center max-w-sm mx-auto text-sm">
            Redesign de arquitetura e virtual staging para profissionais do mercado imobiliário.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <SparkleIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Novo Projeto</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nome / Endereço da Propriedade</label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                  <MapPinIcon />
                </div>
                <input
                  type="text"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="ex: Rua Augusta, 123, Apto 4"
                  className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!newPropertyName.trim()}
              className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] group"
            >
              <span className="relative z-10">Iniciar Projeto</span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </button>
          </form>

          {/* Recent Projects */}
          {properties.length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-800/50">
              <h3 className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                <FolderIcon className="w-3.5 h-3.5" />
                Projetos Recentes
              </h3>
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                {properties.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePropertyId(p.id)}
                    className="w-full text-left px-4 py-3.5 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition-all flex justify-between items-center group opacity-0 animate-fade-slide-in"
                    style={{ animationFillMode: 'forwards', animationDelay: `${i * 75}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                        <FolderIcon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">{p.name}</span>
                    </div>
                    <span className="text-xs text-zinc-600">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCreation;
