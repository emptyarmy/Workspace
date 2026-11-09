import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * Ports kommen aus der .env im Projektordner (wie beim API-Server), Umgebungsvariablen haben Vorrang.
 * So zeigt der Proxy immer auf den Port, auf dem der AI_TPI-Server wirklich läuft (SERVER_PORT).
 */
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const env = { ...loadEnv(mode, root, ''), ...process.env };
  const apiTarget = `http://127.0.0.1:${env.SERVER_PORT ?? 3000}`;
  return {
    plugins: [vue()],
    server: {
      host: '127.0.0.1',
      port: Number(env.WEB_PORT ?? 5173),
      strictPort: true,
      proxy: {
        '/api': apiTarget,
        '/public': apiTarget,
      },
    },
  };
});
