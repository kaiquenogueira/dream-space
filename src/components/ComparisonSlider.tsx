
import React, { useState } from 'react';

interface ComparisonSliderProps {
  originalUrl: string;
  generatedUrl: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalUrl, generatedUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="relative w-full h-full bg-surface-dark overflow-hidden select-none group">
      {/* Generated (full, behind) */}
      <img src={generatedUrl} alt="Generated" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

      {/* Original (clipped via clip-path — no distortion) */}
      <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img
          src={originalUrl}
          alt="Original"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Slider Handle Visual */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center border-2 border-white/50 transition-transform group-active:scale-110">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 6l-4 6 4 6" />
            <path d="M16 6l4 6-4 6" />
          </svg>
        </div>
      </div>

      {/* Invisible Range Input for Interaction & A11y */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 focus:outline-none"
        aria-label="Controle de comparação"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderPosition}
      />

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg pointer-events-none z-10">
        Antes
      </div>
      <div className="absolute bottom-4 right-4 bg-emerald-600/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400/20 shadow-lg pointer-events-none z-10">
        Depois
      </div>
    </div>
  );
};

export default ComparisonSlider;
