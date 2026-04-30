import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, proxy API calls to the FastAPI backend on port 8001
    proxy: {
      '/plan':    'http://localhost:8001',
      '/brief':   'http://localhost:8001',
      '/debrief': 'http://localhost:8001',
      '/meeting-workspace': 'http://localhost:8001',
      '/health':  'http://localhost:8001',
    },
  },
})
