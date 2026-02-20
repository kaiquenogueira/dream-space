import React from 'react';
import { ArchitecturalStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: ArchitecturalStyle | null;
  onSelectStyle: (style: ArchitecturalStyle) => void;
}

const STYLE_META: Record<string, { emoji: string; color: string; description: string }> = {
  [ArchitecturalStyle.MODERN]: { emoji: '🏢', color: 'from-zinc-600 to-zinc-800', description: 'Clean lines & minimal' },
  [ArchitecturalStyle.SCANDINAVIAN]: { emoji: '🌿', color: 'from-stone-300 to-stone-500', description: 'Light, airy & cozy' },
  [ArchitecturalStyle.INDUSTRIAL]: { emoji: '⚙️', color: 'from-gray-600 to-gray-800', description: 'Raw textures & metal' },
  [ArchitecturalStyle.MID_CENTURY]: { emoji: '🪑', color: 'from-amber-600 to-amber-800', description: 'Retro curves & teak' },
  [ArchitecturalStyle.BOHEMIAN]: { emoji: '🎨', color: 'from-orange-500 to-rose-700', description: 'Eclectic & vibrant' },
  [ArchitecturalStyle.MINIMALIST]: { emoji: '◻️', color: 'from-gray-300 to-gray-500', description: 'Less is more' },
  [ArchitecturalStyle.COASTAL]: { emoji: '🌊', color: 'from-cyan-500 to-emerald-700', description: 'Breezy & relaxed' },
  [ArchitecturalStyle.FARMHOUSE]: { emoji: '🏡', color: 'from-emerald-600 to-emerald-800', description: 'Rustic & traditional' },
};

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelectStyle }) => {
  return (
    <div className="flex overflow-x-auto pb-3 gap-2.5 snap-x md:grid md:grid-cols-4 md:overflow-visible md:pb-0 scrollbar-hide">
      {Object.values(ArchitecturalStyle).map((style) => {
        const meta = STYLE_META[style] || { emoji: '✨', color: 'from-zinc-700 to-zinc-800', description: 'Design style' };
        const isSelected = selectedStyle === style;

        return (
          <button
            key={style}
            onClick={() => onSelectStyle(style)}
            className={`
              relative overflow-hidden rounded-xl border-2 text-left transition-all duration-300 group
              flex-shrink-0 w-32 h-24 md:w-auto md:h-[88px] snap-start
              flex flex-col justify-end p-2.5
              ${isSelected
                ? 'border-emerald-500 ring-glow-emerald scale-[1.03]'
                : 'border-zinc-800/50 hover:border-zinc-600/60 bg-zinc-900/80 hover:scale-[1.02]'
              }
            `}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-20 group-hover:opacity-35 transition-opacity duration-300`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Content */}
            <div className="relative z-10 w-full">
              <span className="text-lg leading-none mb-1 block">{meta.emoji}</span>
              <span className={`block font-bold text-xs leading-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                {style}
              </span>
              <span className="block text-xs text-zinc-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity leading-tight truncate">
                {meta.description}
              </span>
            </div>

            {/* Selection Check */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50 animate-scale-in">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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