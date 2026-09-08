import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5173, strictPort: true },
});
