
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.API_URL || 'http://127.0.0.1:3001';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [tailwindcss(), react()],
    define: {
      // SECURITY: API keys must NEVER be exposed to the client bundle.
      // If AI features are needed, proxy through the backend.
      'process.env.DEBUG_LEVEL': JSON.stringify(env.DEBUG_LEVEL || '0'),
      'process.env.ORDER_REFRESH_COOLDOWN_MINUTES': JSON.stringify(env.VITE_ORDER_REFRESH_COOLDOWN_MINUTES || '1')
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      }
    }
  };
});
