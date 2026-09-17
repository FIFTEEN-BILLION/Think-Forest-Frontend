import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    resolve: {
      alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5173,
      strictPort: true,
      // Order matters: the first matching key wins, so /api/v1 must come before /api.
      proxy: {
        // JJCP API v1: same-origin so the HttpOnly refresh cookie works. Keep the /api/v1 prefix.
        '/api/v1': {
          target: env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        // Legacy endpoints: /api/* → backend root.
        '/api': {
          target: 'https://think-forest-backend.vercel.app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
