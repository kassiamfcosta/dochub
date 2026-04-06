import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false,
    },
    allowedHosts: ['hub.zello.space'],
  },
  preview: {
    allowedHosts: ['hub.zello.space'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
