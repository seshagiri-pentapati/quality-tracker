import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, /api is proxied to the backend so the browser sees a single origin (no CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // reachable from a phone on the same Wi-Fi
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:4000',
    },
  },
});
