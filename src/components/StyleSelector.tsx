import React from 'react';
import { ArchitecturalStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: ArchitecturalStyle | null;
  onSelectStyle: (style: ArchitecturalStyle) => void;
}

const STYLE_META: Record<string, { emoji: string; color: string; description: string }> = {
  [ArchitecturalStyle.MODERN]: { emoji: '🏢', color: 'from-zinc-600 to-zinc-800', description: 'Linhas limpas e minimalista' },
  [ArchitecturalStyle.SCANDINAVIAN]: { emoji: '🌿', color: 'from-stone-300 to-stone-500', description: 'Leve, arejado e aconchegante' },
  [ArchitecturalStyle.INDUSTRIAL]: { emoji: '⚙️', color: 'from-gray-600 to-gray-800', description: 'Texturas cruas e metal' },
  [ArchitecturalStyle.MID_CENTURY]: { emoji: '🪑', color: 'from-amber-600 to-amber-800', description: 'Curvas retrô e madeira' },
  [ArchitecturalStyle.BOHEMIAN]: { emoji: '🎨', color: 'from-orange-500 to-rose-700', description: 'Eclético e vibrante' },
  [ArchitecturalStyle.MINIMALIST]: { emoji: '◻️', color: 'from-gray-300 to-gray-500', description: 'Menos é mais' },
  [ArchitecturalStyle.COASTAL]: { emoji: '🌊', color: 'from-cyan-500 to-emerald-700', description: 'Fresco e relaxado' },
  [ArchitecturalStyle.FARMHOUSE]: { emoji: '🏡', color: 'from-emerald-600 to-emerald-800', description: 'Rústico e tradicional' },
};

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelectStyle }) => {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Object.values(ArchitecturalStyle).map((style) => {
        const meta = STYLE_META[style] || { emoji: '✨', color: 'from-zinc-700 to-zinc-800', description: 'Estilo de design' };
        const isSelected = selectedStyle === style;

        return (
          <button
            key={style}
            onClick={() => onSelectStyle(style)}
            className={`
              relative overflow-hidden rounded-lg border-2 text-left transition-all duration-300 group
              w-full h-[68px]
              flex flex-col justify-end p-2
              ${isSelected
                ? 'border-secondary ring-glow-emerald scale-[1.03] shadow-[0_0_18px_rgba(211,156,118,0.22)]'
                : 'border-zinc-800/50 hover:border-zinc-600/60 bg-zinc-900/80 hover:scale-[1.02]'
              }
            `}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-20 group-hover:opacity-35 transition-opacity duration-300`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Content */}
            <div className="relative z-10 w-full">
              <span className="text-base leading-none mb-0.5 block">{meta.emoji}</span>
              <span className={`block font-bold text-[10px] leading-tight truncate ${isSelected ? 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]' : 'text-zinc-200'}`}>
                {style}
              </span>
              <span className={`block text-[9px] leading-tight mt-0.5 ${isSelected ? 'text-zinc-100/90' : 'text-zinc-400'}`}>
                {meta.description}
              </span>
            </div>

            {/* Selection Check */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center shadow-lg shadow-secondary/40 animate-scale-in text-black">
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(StyleSelector);
