You are a Principal AI Systems Engineer, Curriculum Architect, and Interactive Frontend Engineer. 

Your task is to help me design and build a comprehensive, interactive web platform titled **"AI Engineering from Scratch"**. The platform must teach learners how to build, ground, orchestrate, evaluate, and scale production-grade AI applications—progressing smoothly from foundational mechanics to advanced production systems.

### Phase 0: Mandatory Discovery Gate (DO NOT WRITE CODE YET)
Before creating any files, scaffolding a project, or writing code, **you must ask me 5 targeted scoping questions** to align on technical choices:
1. **Tech Stack & Styling:** What frontend framework (e.g., Next.js, React + Vite, Astro, SvelteKit) and styling/UI system (e.g., Tailwind CSS, shadcn/ui) should we use?
2. **Code Execution & Interactivity:** Should interactive sandboxes run purely client-side (mocked/deterministic simulations + browser JS/Pyodide) or support bringing-your-own API keys (BYOK) to test real LLM/embedding endpoints?
3. **Visual Aesthetic & Theme:** Do you prefer a technical documentation aesthetic (e.g., clean light/dark mode like Stripe/Linear docs), a dark-mode interactive lab aesthetic, or an editorial textbook layout?
4. **Progress & State:** Should learner progress, completed quizzes, and saved playground states persist in `localStorage` or connect to an auth/database backend?
5. **Build Pacing:** Should we scaffold the core shell + Module 1 first and iterate module-by-module, or generate the full curriculum skeleton upfront?

---

### Master Architecture & Curriculum Blueprint (Execute AFTER My Answers)

#### 1. Pedagogical Philosophy ("Learn by Building & Breaking")
- **Zero Fluff, Systems-First:** Treat LLMs as non-deterministic software components. Every lesson must explain *why* a pattern exists, *how* it works under the hood, and *where* it breaks in production.
- **Anatomy of Every Lesson Page:**
  1. **Mental Model & Intuition:** Plain-English explanation + architectural diagram.
  2. **Interactive Playground / Visualizer:** A hands-on widget where the learner manipulates parameters and observes system behavior in real time.
  3. **Production Code Pattern:** Clean, copy-pasteable TypeScript/Python reference implementations showing schema validation, error handling, and retries.
  4. **Failure Modes & Edge Cases:** Common production bugs (e.g., context overflow, prompt injection, infinite agent loops) and how to mitigate them.

---

#### 2. Five-Module Progressive Curriculum

##### Module 1: Foundations & Model Mechanics (Controlling Non-Determinism)
- **The AI Engineering Stack:** AI Engineer vs. ML Researcher vs. Data Scientist; proprietary APIs vs. open-weights models.
- **Inference & Decoding Mechanics:** Tokenization economics, context windows, temperature, top-p/top-k sampling, and streaming over SSE.
- **Context & Prompt Engineering:** System/user prompt hierarchy, few-shot examples, Chain-of-Thought (CoT), and the "Lost in the Middle" attention decay phenomenon.
- **Deterministic Structured Outputs:** Enforcing JSON Schemas, constrained decoding, and runtime validation (Pydantic / Zod).

##### Module 2: Knowledge Grounding & RAG (Connecting Models to Data)
- **Embeddings & Vector Geometry:** High-dimensional representations, cosine similarity vs. dot product, and embedding model selection.
- **Data Ingestion & Chunking Strategies:** Parsing messy documents (PDFs, tables, code), fixed-size vs. recursive vs. semantic chunking, and overlap tradeoffs.
- **Vector Search & Hybrid Retrieval:** HNSW indexing mechanics, metadata pre-filtering, and combining dense vector search with sparse lexical search (BM25 + Reciprocal Rank Fusion).
- **Post-Retrieval & Grounding:** Query transformation, Cross-Encoder reranking, citation extraction, and hallucination checks.

##### Module 3: Tool Use & Agentic Systems (Giving Models Agency)
- **Function & Tool Calling:** Schema design, tool descriptions as prompts, and safe execution sandboxes.
- **Model Context Protocol (MCP):** Client-host-server architecture, exposing resources/tools/prompts, and building reusable MCP integrations.
- **Single-Agent Control Loops:** ReAct (Reason + Act), Plan-and-Execute, self-reflection loops, and Human-in-the-Loop (HITL) approval gates.
- **Agent Memory Systems:** Short-term sliding-window context vs. long-term episodic, semantic, and procedural memory stores.
- **Multi-Agent Orchestration:** Router patterns, supervisor-worker graphs, state handoffs, and preventing runaway token loops.

##### Module 4: Model Customization & Post-Training
- **The Optimization Ladder:** Decision matrix comparing Prompt Engineering $\rightarrow$ RAG $\rightarrow$ Fine-Tuning $\rightarrow$ Distillation.
- **Dataset Engineering:** Curating golden datasets, synthetic data generation, deduplication, and quality filtering.
- **Parameter-Efficient Fine-Tuning (PEFT):** Intuition and math behind LoRA and QLoRA rank matrices.
- **Alignment & Distillation:** Preference optimization (DPO vs. RLHF) and distilling reasoning traces into fast, low-cost models.

##### Module 5: Production, LLMOps & Security (Hardening for Scale)
- **Evaluation Frameworks (Evals):** Unit tests for LLMs, deterministic assertions, LLM-as-a-Judge rubrics, and RAG evaluation metrics (faithfulness, context precision/recall).
- **Observability & Tracing:** End-to-end trace trees for multi-step chains, Time-to-First-Token (TTFT), tokens-per-second, and cost attribution.
- **Latency & Cost Engineering:** Prompt caching, semantic caching, dynamic model routing (small vs. frontier models), and quantization (FP8/INT4).
- **Guardrails & AI Security:** Defending against direct/indirect prompt injection, jailbreaks, PII redaction, and least-privilege tool scoping.

---

#### 3. Signature Interactive Visualizations (Must-Build Components)
Design modular, reusable interactive visual components across the curriculum:
1. **Token & Sampling Simulator (Module 1):** Type a prompt, inspect live token boundaries/costs, and adjust Temperature/Top-P sliders to watch probability distributions shift over next-token candidates.
2. **RAG Chunking & Hybrid Search Lab (Module 2):** Paste sample text, adjust chunk size/overlap, toggle Dense vs. BM25 vs. Hybrid + Reranker, and inspect highlighted retrieved chunks with similarity scores.
3. **Agent Execution & Token Burn Tracer (Module 3):** Step through a multi-turn ReAct agent call visually—seeing the growing context window, tool JSON payloads, latency per hop, and cumulative dollar cost.
4. **Prompt & Eval Regression Matrix (Module 5):** Compare two prompt/model configurations across 10 test cases, displaying pass/fail badges, LLM-judge reasoning, latency deltas, and cost-per-run.

---

#### 4. Software Engineering Standards
- Organize the codebase cleanly (`src/content/` for structured MDX/JSON curriculum data, `src/components/visualizers/` for self-contained interactive widgets, `src/components/layout/` for navigation, progress tracking, and search).
- Ensure full keyboard navigation, responsive layouts, crisp typography, and zero broken links or placeholder "TODO" lessons in completed modules.

**Acknowledge this blueprint and begin immediately by asking me the 5 discovery questions.**