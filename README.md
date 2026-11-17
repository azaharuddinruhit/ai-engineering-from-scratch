# AI Engineering from Scratch

An interactive course on building, grounding, orchestrating, evaluating and scaling production-grade AI applications.
Every lesson follows the same anatomy: **mental model → interactive playground → production code pattern → failure modes**.
All playgrounds are deterministic, client-side simulations: no API keys, no backend.

## Status

| Module | Status |
| --- | --- |
| 1. Foundations & Model Mechanics | ✅ 4 lessons, 4 labs |
| 2. Knowledge Grounding & RAG | ✅ 4 lessons, 4 labs |
| 3. Tool Use & Agentic Systems | Planned |
| 4. Model Customization & Post-Training | Planned |
| 5. Production, LLMOps & Security | Planned |

## Stack

- [Astro](https://astro.build) 7 static site with MDX lessons, deployed to GitHub Pages
- React islands for the interactive labs (hydrated only when scrolled into view) and the home page's live sampler
- Tailwind CSS v4 with a viridis-derived palette and light and dark themes
- IBM Plex Sans for text, JetBrains Mono for code and numbers, both self-hosted
- Math written in TeX and rendered with [KaTeX](https://katex.org) at build time (no client-side script)
- Zod for the structured-output lab, Vitest for the simulation engines and the Markdown plugin
- Learner progress stored in `localStorage`

## Project layout

```
PRODUCT.md                    # who the course is for, its purpose and principles
DESIGN.md                     # design system: colours, type, components, do's and don'ts
.impeccable/design.json       # machine-readable companion to DESIGN.md
src/
  content/
    modules.json              # module metadata (status, topics)
    lessons/<module>/*.mdx    # lessons; frontmatter validated in src/content.config.ts
  components/
    layout/                   # header, sidebar + search, TOC, progress tracking
    content/                  # MDX building blocks: Callout, FailureMode, diagrams
    visualizers/              # self-contained interactive labs and the home page sampler (React)
      ui/                     # shared lab chrome, controls, status icons, SVG line chart
  lib/
    sim/                      # pure simulation engines + unit tests
    markdown/katex.ts         # renders $…$ / $$…$$ math with KaTeX during the build
    curriculum.ts, paths.ts, progress.ts
  styles/global.css           # design tokens (palette, fonts) and global styles
  pages/                      # home, module overview, lesson route, 404
```

## Develop

Requires Node.js 22.23.4 or later (Astro 7.4's minimum).

```sh
npm install
npm run dev        # http://localhost:4321/ai-engineering-from-scratch/
npm test           # unit tests
npm run build      # type-check (astro check) + static build into dist/
```

## Adding a lesson

1. Create `src/content/lessons/<module-id>/<slug>.mdx` with `title`, `description`, `module`, `order`, `minutes` and `playground` frontmatter.
2. Use the four standard sections: `## Mental model`, `## Playground`, `## Production pattern: …`, `## Failure modes`.
3. Write formulas in TeX: `$…$` inline, `$$…$$` on their own lines for display. Invalid TeX fails the build.
4. Put simulation logic in `src/lib/sim/` with tests, and the UI in `src/components/visualizers/`.
5. Follow `DESIGN.md` for colours, type and components.
6. Set the module's `status` to `available` in `modules.json` once all its lessons are published.

## Deploy

Pushing to `master` runs `.github/workflows/deploy.yml` (tests → build → GitHub Pages).
In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
