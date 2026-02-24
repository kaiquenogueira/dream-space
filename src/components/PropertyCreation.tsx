import React, { useState } from 'react';
import { LayoutIcon, SparkleIcon, MapPinIcon, FolderIcon, ChevronRightIcon } from './Icons';
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
    <div className="min-h-screen bg-primary-dark text-text-main flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Animated Background Orbs - Adjusted for copper and higher contrast */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[100px]"
          style={{
            background: 'radial-gradient(circle, var(--color-secondary), transparent 70%)',
            animation: 'orbFloat1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full opacity-[0.02] blur-[120px]"
          style={{
            background: 'radial-gradient(circle, var(--color-secondary-light), transparent 70%)',
            animation: 'orbFloat2 25s ease-in-out infinite',
          }}
        />
      </div>

      {/* Subtle grid with higher contrast */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(211, 156, 118, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(211, 156, 118, 0.4) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md opacity-0 animate-fade-slide-in">
        {/* Branding */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary/10 mb-6 border border-secondary/20 shadow-[0_0_30px_rgba(211,156,118,0.15)] animate-glow-pulse">
            <LayoutIcon className="w-6 h-6 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-text-main mb-3 tracking-wide">
            Etherea
          </h1>
          <p className="text-text-muted text-center max-w-sm mx-auto text-[11px] uppercase tracking-[0.2em] font-medium">
            Luxury AI Interior Design
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/40 backdrop-blur-2xl p-8 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle noise texture or top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-primary-dark/50 flex items-center justify-center border border-white/5 shadow-inner">
              <SparkleIcon className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-xl font-normal text-text-main font-heading tracking-wide">Novo Projeto</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-text-muted/70 uppercase tracking-widest mb-3 ml-1">
                Nome ou Endereço da Propriedade
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/50 group-focus-within:text-secondary transition-colors duration-300">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="Ex: Cobertura Augusta, 123"
                  className="w-full bg-primary-dark/80 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-sm text-text-main placeholder-text-muted/30 focus:outline-none focus:ring-1 focus:ring-secondary/50 focus:border-secondary/50 transition-all duration-300 shadow-inner"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!newPropertyName.trim()}
              className="w-full bg-gradient-to-r from-secondary to-secondary-light hover:from-secondary-light hover:to-secondary text-primary-dark font-bold text-xs uppercase tracking-[0.15em] py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(211,156,118,0.3)] hover:shadow-[0_4px_25px_rgba(211,156,118,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_20px_rgba(211,156,118,0.3)] transform hover:-translate-y-0.5"
            >
              Iniciar Projeto
            </button>
          </form>

          {/* Recent Projects */}
          {properties.length > 0 && (
            <div className="mt-10 pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-bold text-text-muted/70 mb-4 ml-1 uppercase tracking-widest">
                Projetos Recentes
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {properties.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePropertyId(p.id)}
                    className="w-full text-left px-4 py-4 rounded-xl hover:bg-white/[0.03] transition-colors flex justify-between items-center group opacity-0 animate-fade-slide-in relative overflow-hidden"
                    style={{ animationFillMode: 'forwards', animationDelay: `${i * 75}ms` }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl"></div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-secondary/10 group-hover:text-secondary text-text-muted transition-colors">
                        <FolderIcon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-main group-hover:text-white transition-colors">{p.name}</span>
                        <span className="text-[10px] text-text-muted/50 font-mono mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {/* Chevron for modern list feel */}
                    <div className="text-text-muted/30 group-hover:text-secondary group-hover:translate-x-1 transition-all">
                      <ChevronRightIcon className="w-5 h-5" />
                    </div>
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
