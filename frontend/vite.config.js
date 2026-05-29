import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output directly into the Worker's static assets directory
    outDir: '../worker/public',
    emptyOutDir: true,
  },
})
