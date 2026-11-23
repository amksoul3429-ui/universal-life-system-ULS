import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  base: mode === 'preview-pages' ? '/universal-life-system-ULS/' : '/',
  plugins: [react()],
}));
