import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api is proxied to Spring Boot so the browser sees a single origin
// (required for the SameSite=Strict session cookie and CSRF cookie to work).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target: env.VITE_DEV_API_TARGET || 'http://localhost:8080', changeOrigin: false } },
    },
  }
})
