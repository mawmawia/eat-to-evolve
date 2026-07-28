import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    proxy: { '/socket.io': 'http://localhost:3000' }
  }
});
