import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'material-colors', test: /node_modules\/@material\/material-color-utilities\// },
            { name: 'lesson-math', test: /node_modules\/katex\// },
            { name: 'lesson-charts', test: /node_modules\/(?:d3-[^/]+|internmap)\// },
            { name: 'ui-vendor', test: /node_modules\/(?!@material\/|katex\/|d3-[^/]+\/|internmap\/)/ },
          ],
        },
      },
    },
  },
});
