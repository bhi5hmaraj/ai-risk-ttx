import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Avoid writing cache into node_modules (restricted in some environments)
      cacheDir: '.vite-temp',
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
        },
        // Ensure single React instance during tests to avoid duplicate dispatcher
        dedupe: ['react', 'react-dom'],
      },
      server: {
        proxy: env.VITE_API_PROXY_TARGET
          ? {
              '/api': {
                target: env.VITE_API_PROXY_TARGET,
                changeOrigin: true,
              },
            }
          : undefined,
      }
    };
});
