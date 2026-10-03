import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Single-bundle build (no PWA plugin / service worker) used only to produce
// a self-contained preview that can be inlined into one HTML file, e.g. for
// publishing as a Claude Artifact. The real PWA build is vite.config.js.
export default defineConfig({
  base: './',
  define: {
    __ENABLE_PWA__: false,
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    outDir: 'dist-artifact',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'bundle.js',
      },
    },
  },
})
