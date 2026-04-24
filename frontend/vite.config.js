import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth':      'http://localhost:5000',
      '/ai':        'http://localhost:5000',
      '/customers': 'http://localhost:5000',
      '/orders':    'http://localhost:5000',
      '/payment':   'http://localhost:5000',
      '/menu':      'http://localhost:5000',
      '/tables':    'http://localhost:5000',
      '/inventory': 'http://localhost:5000',
      '/reports':   'http://localhost:5000',
      '/employees': 'http://localhost:5000',
    }
  }
})
