import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache app shell only — not API responses
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
      manifest: false, // We provide our own manifest.json in public/
      devOptions: { enabled: false }, // SW only in production builds
    }),
  ],
  server: {
    // Proxy /api/* requests to the Express backend so we don't need CORS in dev
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
