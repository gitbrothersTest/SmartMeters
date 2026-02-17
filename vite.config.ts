
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Allow overriding the API URL for local dev if needed
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
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DEBUG_LEVEL': JSON.stringify(env.DEBUG_LEVEL || '0'),
        'process.env.ORDER_REFRESH_COOLDOWN_MINUTES': JSON.stringify(env.ORDER_REFRESH_COOLDOWN_MINUTES || '10')
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
