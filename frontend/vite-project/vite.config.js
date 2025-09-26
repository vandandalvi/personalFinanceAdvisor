import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/upload': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
