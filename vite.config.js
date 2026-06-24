import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Garante que só existe UMA cópia do React — evita o erro "Invalid hook call"
    // causado por pacotes como react-quill que trazem seu próprio React
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});