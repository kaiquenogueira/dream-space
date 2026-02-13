import React from 'react';
import { ArchitecturalStyle } from '../types';

interface StyleSelectorProps {
  selectedStyle: ArchitecturalStyle | null;
  onSelectStyle: (style: ArchitecturalStyle) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onSelectStyle }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Object.values(ArchitecturalStyle).map((style) => (
        <button
          key={style}
          onClick={() => onSelectStyle(style)}
          className={`
            p-4 rounded-lg border text-left transition-all relative overflow-hidden group
            ${selectedStyle === style 
              ? 'border-blue-500 bg-blue-500/10 text-blue-100 ring-1 ring-blue-500' 
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-750'
            }
          `}
        >
          <span className="relative z-10 font-medium text-sm md:text-base">{style}</span>
          {/* Decorative background element */}
          <div className={`absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-white/5 to-transparent transform translate-x-4 translate-y-4 rounded-full transition-transform group-hover:scale-150 ${selectedStyle === style ? 'from-blue-500/20' : ''}`} />
        </button>
      ))}
    </div>
  );
};

export default StyleSelector;