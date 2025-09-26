import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      optimizeDeps: {
        include: ['zod']
      },
      ssr: {
        noExternal: ['zod']
      },
      define: {
        'process.env.VITE_LITELLM_BASE_URL': JSON.stringify(env.VITE_LITELLM_BASE_URL),
        'process.env.VITE_LITELLM_API_KEY': JSON.stringify(env.VITE_LITELLM_API_KEY),
        'process.env.VITE_LLM_MODEL': JSON.stringify(env.VITE_LLM_MODEL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
