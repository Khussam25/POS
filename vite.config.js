import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD__: JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
      || new Date().toISOString().slice(2, 16).replace(/[-:T]/g, '')
    ),
  },
})
