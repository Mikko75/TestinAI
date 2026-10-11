import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Puhelintestauksessa sivu avataan HTTPS-tunnelin kautta (ks. README).
const tunnelHosts = ['.trycloudflare.com']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { allowedHosts: tunnelHosts },
  preview: { allowedHosts: tunnelHosts },
})
