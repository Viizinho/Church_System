import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: { '/api': { target: 'http://localhost:3333', changeOrigin: true } },
    // Libera o acesso pelo túnel temporário do Cloudflare (`npm run dev:tunel`), usado para testar
    // no celular antes de publicar. Endereços de IP da rede local já são aceitos por padrão.
    allowedHosts: ['.trycloudflare.com'],
  },
})
