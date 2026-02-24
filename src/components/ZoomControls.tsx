
import React from 'react';
import { ZoomInIcon, ZoomOutIcon, RefreshIcon } from './Icons';
import { UI_CONSTANTS } from '../constants';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onResetZoom }) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl z-30 transition-opacity duration-300 hover:opacity-100 opacity-0 group-hover:opacity-100">
      <button
        onClick={onZoomOut}
        disabled={zoom <= UI_CONSTANTS.MIN_ZOOM}
        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Diminuir Zoom"
        aria-label="Diminuir Zoom"
      >
        <ZoomOutIcon className="w-4 h-4" />
      </button>
      <span className="text-xs font-mono text-zinc-400 min-w-[3ch] text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        disabled={zoom >= UI_CONSTANTS.MAX_ZOOM}
        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Aumentar Zoom"
        aria-label="Aumentar Zoom"
      >
        <ZoomInIcon className="w-4 h-4" />
      </button>
      {zoom > UI_CONSTANTS.MIN_ZOOM && (
        <>
          <div className="w-px h-3 bg-zinc-700 mx-1" />
          <button
            onClick={onResetZoom}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Redefinir Zoom"
            aria-label="Redefinir Zoom"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default ZoomControls;
