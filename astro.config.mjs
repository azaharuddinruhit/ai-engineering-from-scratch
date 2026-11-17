// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { katexMath } from './src/lib/markdown/katex';

// Deployed as a GitHub Pages project site: https://<owner>.github.io/<repo>/
export default defineConfig({
  site: 'https://azaharuddinruhit.github.io',
  base: '/ai-engineering-from-scratch',
  trailingSlash: 'always',
  integrations: [react(), mdx()],
  markdown: {
    // `$…$` / `$$…$$` math is rendered to HTML at build time; pages ship KaTeX's stylesheet, no script.
    processor: satteri({ features: { math: true }, hastPlugins: [katexMath] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
