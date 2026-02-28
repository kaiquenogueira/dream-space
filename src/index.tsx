import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const renderError = (title: string, message: string) => {
  root.render(
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-surface/60 border border-glass-border rounded-sm p-6 text-center space-y-3">
        <div className="text-lg font-semibold text-text-main">{title}</div>
        <div className="text-sm text-text-muted whitespace-pre-line">{message}</div>
      </div>
    </div>
  );
};

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';

import('./App')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Falha inesperada ao carregar o aplicativo.';
    const hint = message.includes('Missing Supabase environment variables')
      ? 'Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env e reinicie o dev server.'
      : message;
    renderError('Falha ao inicializar o aplicativo', hint);
  });
