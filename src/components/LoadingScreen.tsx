import React from 'react';
import { RefreshIcon } from './Icons';

export const LoadingScreen = () => (
  <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center space-y-4">
    <RefreshIcon className="animate-spin text-secondary w-12 h-12" />
    <p className="text-text-muted text-lg animate-pulse">Carregando...</p>
  </div>
);
