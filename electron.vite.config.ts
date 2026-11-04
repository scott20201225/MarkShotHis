import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': resolve(root, 'src/shared') } }
  },
  preload: {},
  renderer: {
    plugins: [vue()],
    resolve: { alias: { '@shared': resolve(root, 'src/shared') } }
  }
})
