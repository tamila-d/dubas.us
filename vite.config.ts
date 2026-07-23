import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { rootContentPlugin } from './scripts/content/vite-content-plugin.ts'

const productionStylesheet =
  /<link rel="stylesheet"([^>]* href="\/assets\/[^"]+\.css"[^>]*)>/g

function nonBlockingStylesPlugin(): Plugin {
  return {
    name: 'non-blocking-production-styles',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(productionStylesheet, (_, attributes: string) => {
          const preload =
            `<link rel="preload" as="style"${attributes} ` +
            `data-app-stylesheet ` +
            `onload="this.onload=null;this.rel='stylesheet';` +
            `this.dataset.appStylesheet='ready'">`
          const fallback =
            `<noscript><link rel="stylesheet"${attributes}></noscript>`
          return `${preload}${fallback}`
        })
      },
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    rootContentPlugin(),
    react(),
    tailwindcss(),
    nonBlockingStylesPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
