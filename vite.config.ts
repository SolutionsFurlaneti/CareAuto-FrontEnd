import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:5080';
  // App Android (npm run build:android): site na raiz do APK e API remota em HTTPS.
  const android = mode === 'android';
  const androidApi = env.VITE_API_BASE_URL || 'https://www.furlaneti.com.br/autocare-api';
  return {
    base: android ? '/' : env.VITE_BASE_PATH || '/',
    ...(android
      ? { define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(androidApi) } }
      : {}),
    plugins: [
      react(),
      tailwindcss(),
      ...(env.COVERAGE === 'true'
        ? [
            istanbul({
              include: 'src/**/*',
              exclude: ['node_modules', 'test'],
              extension: ['.js', '.ts', '.tsx'],
              requireEnv: false,
            }),
          ]
        : []),
    ],
    server: { port: 5173, strictPort: true, proxy: { '/api': { target }, '/health': { target } } },
    build: {
      // No APK: sem source maps (tamanho e código-fonte) e JavaScript compatível com WebViews
      // mais antigas de maquininhas (Chrome 87+, Android 7+).
      sourcemap: mode !== 'android',
      ...(mode === 'android' ? { target: ['es2020', 'chrome87'] } : {}),
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            dialogs: ['sweetalert2'],
          },
        },
      },
    },
  };
});
