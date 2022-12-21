import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';
import ts from 'rollup-plugin-ts';

const config = defineConfig({
  input: './src/index.ts',
  output: {
    dir: './dist',
    format: 'esm',
  },
  plugins: [ts(), terser({ compress: { passes: 2 } })],
});

export default config;
