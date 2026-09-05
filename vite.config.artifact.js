import { defineConfig } from 'vite'

// Single-bundle build (no PWA plugin / service worker) used only to produce
// a self-contained preview that can be inlined into one HTML file, e.g. for
// publishing as a Claude Artifact. The real PWA build is vite.config.js.
export default defineConfig({
  base: './',
  define: {
    __ENABLE_PWA__: false,
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
