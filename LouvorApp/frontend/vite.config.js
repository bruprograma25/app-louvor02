import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'livekit-client',
              test: /node_modules[\\/]livekit-client[\\/]/,
              priority: 10,
            },
            {
              name: 'livekit-components',
              test: /node_modules[\\/]@livekit[\\/]/,
              priority: 5,
            },
          ],
        },
      },
    },
  },
})
