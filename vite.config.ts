/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function versionJsonPlugin() {
  return {
    name: 'version-json',
    generateBundle() {
      const version = (globalThis as any).process?.env?.VITE_APP_VERSION || '1.0.0'
      const ctx = this as any
      ctx.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, buildTime: new Date().toISOString() }),
      })
    },
  }
}

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'GymProgress — Nutrición y entrenamiento',
        short_name: 'GymProgress',
        description:
          'Registra tu alimentación, macros y entrenamientos de fuerza. Analiza tu progreso semanal y mensual.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#090b10',
        theme_color: '#0b0e14',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
