import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // 🧊 Interruptor de aislamiento (Zero-State).
  // Si VITE_USE_MOCK_DB === 'true', TODO `import ... from "firebase/firestore"`
  // se redirige al mock, de modo que las operaciones de lectura/escritura
  // resuelven exitosamente sin tocar la API real de Firebase.
  const env = loadEnv(mode, process.cwd(), '');
  const useMockFirestore = env.VITE_USE_MOCK_DB === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: useMockFirestore
        ? [
            {
              find: 'firebase/firestore',
              replacement: path.resolve(__dirname, 'src/services/firestore/firestore.mock.ts')
            }
          ]
        : []
    },
    build: {
      // Le decimos a Vite: "Tranquilo, yo sé que mis librerías de PDF pesan. No me avises a menos que pasen de 1 MB (1000 kB)"
      chunkSizeWarningLimit: 1000, 
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase'; 
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'vendor-charts'; 
              }
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
                return 'vendor-pdf-utils'; 
              }
              if (id.includes('react/') || id.includes('react-dom/')) {
                return 'vendor-react'; 
              }
              return 'vendor-core'; 
            }
          }
        }
      }
    }
  };
});