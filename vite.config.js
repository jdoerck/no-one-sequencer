import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

// `npm run build` inlines all JS and CSS into dist/index.html, so the built app
// stays a single self-contained file like the original no-one.html.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {target: 'es2020'},
});
