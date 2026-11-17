# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Working software engineers who already ship backend or frontend code in TypeScript or Python and are moving into building LLM-powered features. They are new to embeddings, RAG, agents, fine-tuning, evals and LLM security. They learn on their own, usually at a desk with an editor open beside the lesson, and want patterns they can carry straight into production code.

## Product Purpose

AI Engineering from Scratch is a free, public, interactive course on building, grounding, orchestrating, evaluating and scaling production-grade AI applications. It progresses from model mechanics to production systems across five modules:

1. Foundations & Model Mechanics
2. Knowledge Grounding & RAG
3. Tool Use & Agentic Systems
4. Model Customization & Post-Training
5. Production, LLMOps & Security

Success means learners finish modules and can ship production AI features: they understand why a technique works, have seen it fail, and leave with code they can adapt.

## Positioning

Every concept is something the learner manipulates, not only reads about. Each lesson pairs its explanation with a playground that runs a deterministic simulation in the browser, so learners can push a system into its failure modes (a broken chunk boundary, a sampler at high temperature, a fabricated citation) without an account, an API key or a bill.

## Operating Context

- Lessons are long-form technical reading, interleaved with interactive labs and code in TypeScript and Python.
- Every lesson follows the same four-part anatomy: **mental model + diagram → interactive playground → production code pattern → failure modes**.
- Learners move through a sidebar curriculum, search lessons, mark lessons complete, and switch between light and dark themes.
- Learners copy production code into their own projects, so code must be complete, typed and correct, with validation, error handling and retries where relevant.

## Capabilities and Constraints

- **Static hosting only.** The site deploys to GitHub Pages at the `/ai-engineering-from-scratch/` base path. There is no backend, no accounts and no API keys. All playgrounds are client-side simulations.
- **Progress lives in `localStorage`.** Completed lessons and the theme preference are stored per browser and are not synced across devices.
- **Vendor-neutral code.** Production patterns inject provider calls (for example a `generate` or `embedBatch` function) instead of tying learners to one model provider.
- **Completed modules contain no placeholders.** A module is marked available only when every lesson is complete; upcoming modules show their topics without links.
- **Zero broken internal links**, checked after every build.
- **Status (2026-11-17):** Modules 1 and 2 are available with four lessons and four labs each. Modules 3–5 are upcoming.
- **Terminology:** a lesson's interactive widget is called a *playground* in lesson structure and a *lab* in its UI title.

## Brand Commitments

- Name: **AI Engineering from Scratch**.
- Voice: direct, precise, practitioner to practitioner. Explain mechanisms plainly, name trade-offs, and say when a simulation is a simplification.

## Evidence on Hand

- Curriculum metadata: `src/content/modules.json`.
- Published lessons: `src/content/lessons/foundations/` and `src/content/lessons/rag/`.
- Simulation engines with unit tests: `src/lib/sim/`, including `lesson-claims.test.ts`, which checks the lab results that lesson text describes.
- The original course brief: `prompt.md`.
- There are no testimonials, learner counts, completion data, endorsements or press. Future work must not fabricate any.

## Product Principles

1. **Learn by breaking it.** Every lesson lets the learner trigger the failure it warns about.
2. **Production over toy.** Code patterns include validation, errors and retries, and are written to be adapted, not admired.
3. **Same anatomy everywhere.** The four-part lesson structure stays consistent, so learners always know where they are.
4. **Free and frictionless.** Nothing stands between a learner and a lesson: no sign-up, no keys, no install.
5. **Provider-agnostic.** Teach the mechanism, not one vendor's SDK.

## Accessibility & Inclusion

The brief requires full keyboard navigation and a responsive layout from phone to desktop. No formal conformance standard (such as WCAG 2.2 AA) has been committed to.
