
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Vite's loadEnv only exposes VITE_ prefixed variables by default for security.
    // The third parameter `''` loads all env vars, but prefixing is the standard practice.
    const env = loadEnv(mode, process.cwd(), '');

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
        // CORRECTED: Use a VITE_ prefixed variable for client-side access.
        // The value from .env will now be correctly read. Default to '1' if not set.
        'process.env.ORDER_REFRESH_COOLDOWN_MINUTES': JSON.stringify(env.VITE_ORDER_REFRESH_COOLDOWN_MINUTES || '1')
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
