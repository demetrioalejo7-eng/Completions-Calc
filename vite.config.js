import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // two independent apps: the calculator (index.html) and the CT weight
      // simulator (simulador-ct/index.html)
      input: {
        main: resolve(__dirname, 'index.html'),
        simulador: resolve(__dirname, 'simulador-ct/index.html'),
      },
    },
  },
  define: {
    __ENABLE_PWA__: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Completions Calc',
        short_name: 'Compl. Calc',
        description:
          'Calculadora de ingeniería de completions: capacidad, volumen anular, múltiples sartas, cemento, ácido, proppant, tanques, hidrostática, nitrógeno/CO2 y más.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // the simulator is a separate page: never answer it with the calculator's index.html
        navigateFallbackDenylist: [/simulador-ct/],
      },
    }),
  ],
})
