import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    watch: {
      // Use polling with a longer interval to reduce false refreshes
      // This is needed for Docker volume mounts
      usePolling: true,
      interval: 1000, // Check every 1 second instead of default 100ms
      binaryInterval: 3000, // Check binary files less frequently
    },
    hmr: {
      // Overlay is the error display - keep it
      overlay: true,
    },
  },
})
