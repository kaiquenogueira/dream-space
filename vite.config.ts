import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: '0.0.0.0',
    },
    plugins: [
      react({
        include: "**/*.tsx",
      }),
      tailwindcss()
    ],
    assetsInclude: ['**/*.html'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'react';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('@google')) return 'google';
              if (id.includes('jszip') || id.includes('file-saver')) return 'downloads';
              if (id.includes('tailwindcss') || id.includes('postcss') || id.includes('autoprefixer')) return 'styles';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
