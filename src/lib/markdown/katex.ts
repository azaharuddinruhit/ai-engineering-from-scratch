import { fromHtml } from 'hast-util-from-html';
import katex from 'katex';
import { defineHastPlugin } from 'satteri';

/**
 * Renders the math that Sätteri's `math` feature parses (`$…$` inline, `$$…$$` display) to KaTeX at build
 * time, so lesson pages ship KaTeX's stylesheet but no script. Invalid TeX fails the build.
 *
 * KaTeX's HTML is parsed into elements (as rehype-katex does) because MDX can't emit raw HTML nodes, and
 * replacing the math in the Markdown tree instead would re-parse that HTML as Markdown.
 */
export const katexMath = defineHastPlugin({
  name: 'katex-math',
  element: {
    filter: ['pre', 'code'],
    visit(node, ctx) {
      // Display math arrives as <pre><code class="math-display">, inline math as <code class="math-inline">.
      const code = node.tagName === 'pre' ? node.children.find((c) => c.type === 'element' && c.tagName === 'code') : node;
      if (code?.type !== 'element') return;
      const classes = code.properties.className;
      const displayMode = node.tagName === 'pre';
      if (!Array.isArray(classes) || !classes.includes(displayMode ? 'math-display' : 'math-inline')) return;
      const html = katex.renderToString(ctx.textContent(code), { displayMode, throwOnError: true });
      // KaTeX always wraps its output in a single root span.
      return fromHtml(html, { fragment: true }).children[0];
    },
  },
});
