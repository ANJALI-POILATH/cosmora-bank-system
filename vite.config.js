import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The SharedBank Worker only allows http://localhost:5173 for local testing,
// so the dev server must stay on that port rather than picking another one.
export default defineConfig({
  base: './',
  plugins: [react()],
  // The API server keeps its database and uploads in server/; never reload the page for those.
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/server/**'] } },
  preview: { port: 5173, strictPort: true },
});
