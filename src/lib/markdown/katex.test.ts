import { describe, expect, it } from 'vitest';
import { markdownToHtml } from 'satteri';
import { katexMath } from './katex';

const render = (markdown: string) =>
  markdownToHtml(markdown, { features: { math: true }, hastPlugins: [katexMath] }).html;

describe('katexMath', () => {
  it('renders inline math inside the paragraph', () => {
    const html = render('Logits $z_i$ go in.');
    expect(html).toMatch(/^<p>Logits <span class="katex">/);
    expect(html).not.toContain('math-inline');
  });

  it('renders display math as a block, replacing the code block', () => {
    const html = render('$$\n\\frac{1}{k + r}\n$$\n');
    expect(html).toContain('<span class="katex-display">');
    expect(html).not.toContain('<pre');
  });

  it('keeps the TeX source intact for screen readers and copying', () => {
    expect(render('$\\lVert \\mathbf{a} \\rVert \\, x_{i}$')).toContain(
      '<annotation encoding="application/x-tex">\\lVert \\mathbf{a} \\rVert \\, x_{i}</annotation>',
    );
  });

  it('leaves ordinary code alone', () => {
    expect(render('Use `a_b` here.\n\n```ts\nconst x = 1;\n```\n')).not.toContain('katex');
  });

  it('fails loudly on invalid TeX', () => {
    expect(() => render('$\\frac{1}$')).toThrow();
  });
});
