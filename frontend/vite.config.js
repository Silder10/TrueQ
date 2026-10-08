import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, Vite sirve el frontend y hace de proxy hacia Flask.
// Así el navegador siempre habla con el mismo origen y evitamos depender
// de localhost/127.0.0.1 en cada dispositivo.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
        ws: true,
      },
      '/static': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})
