
import React, { useState } from 'react';
import { DownloadIcon, ImageIcon, ColumnsIcon } from './Icons';
import { UploadedImage } from '../types';

interface DownloadMenuProps {
  activeImage: UploadedImage;
  imageIndex: number;
  hasGeneratedImages: boolean;
  isDownloadingZip: boolean;
  onDownloadSingle: (url: string, name: string) => void;
  onDownloadComparison: (originalUrl: string, generatedUrl: string) => void;
  onDownloadAll: () => void;
}

const DownloadMenu: React.FC<DownloadMenuProps> = ({
  activeImage,
  imageIndex,
  hasGeneratedImages,
  isDownloadingZip,
  onDownloadSingle,
  onDownloadComparison,
  onDownloadAll
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  if (!activeImage.generatedUrl && !hasGeneratedImages) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
        onBlur={() => setTimeout(() => setShowDownloadMenu(false), 200)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-white rounded-xl transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-900/35 transform hover:-translate-y-0.5 active:translate-y-0 text-xs font-bold relative overflow-hidden group"
        title="Baixar"
        aria-label="Opções de download"
      >
        <DownloadIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Baixar</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDownloadMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/40 z-50 py-1.5 animate-scale-in">
          {activeImage.generatedUrl && (
            <>
              <button
                onClick={() => {
                  onDownloadSingle(activeImage.generatedUrl!, `design-${imageIndex + 1}`);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 hover:text-white transition-colors flex items-center gap-3"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="block font-medium text-xs">Apenas o Resultado</span>
                  <span className="block text-xs text-zinc-500">Baixar design de IA</span>
                </div>
              </button>
              <button
                onClick={() => {
                  onDownloadComparison(activeImage.previewUrl, activeImage.generatedUrl!);
                  setShowDownloadMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 hover:text-white transition-colors flex items-center gap-3"
              >
                <ColumnsIcon className="w-4 h-4 text-teal-400" />
                <div>
                  <span className="block font-medium text-xs">Antes e Depois</span>
                  <span className="block text-xs text-zinc-500">Comparação lado a lado</span>
                </div>
              </button>
            </>
          )}
          {hasGeneratedImages && (
            <>
              <div className="border-t border-zinc-800/60 my-1.5" />
              <button
                onClick={() => {
                  if (!isDownloadingZip) onDownloadAll();
                  // Don't close menu immediately to show feedback
                }}
                disabled={isDownloadingZip}
                className={`w-full text-left px-4 py-2.5 text-sm text-zinc-200 transition-colors flex items-center gap-3 ${isDownloadingZip ? 'opacity-70 cursor-not-allowed' : 'hover:bg-zinc-800/60 hover:text-white'
                  }`}
              >
                {isDownloadingZip ? (
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                ) : (
                  <DownloadIcon className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <span className="block font-medium text-xs">
                    {isDownloadingZip ? 'Criando ZIP...' : 'Baixar Tudo (ZIP)'}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {isDownloadingZip ? 'Por favor, aguarde' : 'Todos os designs gerados'}
                  </span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;
