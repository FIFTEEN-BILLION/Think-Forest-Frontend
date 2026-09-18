import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';
  return {
    plugins: [react()],
    resolve: {
      alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/v1': { target, changeOrigin: true, ws: true },
        '/api': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') },
      },
    },
  };
});
