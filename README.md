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

- [Astro](https://astro.build) static site with MDX lessons, deployed to GitHub Pages
- React islands for the interactive visualizers (hydrated only when scrolled into view)
- Tailwind CSS v4 with a light/dark technical-docs theme
- Zod for the structured-output lab, Vitest for the simulation engines
- Learner progress stored in `localStorage`

## Project layout

```
src/
  content/
    modules.json              # module metadata (status, topics)
    lessons/<module>/*.mdx    # lessons; frontmatter validated in src/content.config.ts
  components/
    layout/                   # header, sidebar + search, TOC, progress tracking
    content/                  # MDX building blocks: Callout, FailureMode, diagrams
    visualizers/              # self-contained interactive labs (React)
      ui/                     # shared lab chrome, controls, SVG line chart
  lib/
    sim/                      # pure simulation engines + unit tests
    curriculum.ts, paths.ts, progress.ts
  pages/                      # home, module overview, lesson route, 404
```

## Develop

Requires Node.js 22.

```sh
npm install
npm run dev        # http://localhost:4321/ai-engineering-from-scratch/
npm test           # simulation engine unit tests
npm run build      # type-check (astro check) + static build into dist/
```

## Adding a lesson

1. Create `src/content/lessons/<module-id>/<slug>.mdx` with `title`, `description`, `module`, `order`, `minutes` and `playground` frontmatter.
2. Use the four standard sections: `## Mental model`, `## Playground`, `## Production pattern: …`, `## Failure modes`.
3. Put simulation logic in `src/lib/sim/` with tests, and the UI in `src/components/visualizers/`.
4. Set the module's `status` to `available` in `modules.json` once all its lessons are published.

## Deploy

Pushing to `master` runs `.github/workflows/deploy.yml` (tests → build → GitHub Pages).
In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
