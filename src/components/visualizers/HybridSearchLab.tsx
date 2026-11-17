import { useId, useMemo, useState, type ReactNode } from 'react';
import { CHUNK_STRATEGIES, CHUNKERS, type ChunkStrategy } from '@/lib/sim/chunking';
import { HANDBOOK } from '@/lib/sim/corpus';
import { bm25Search, denseSearch, retrieve, type RetrievalMode } from '@/lib/sim/retrieval';
import { contentTerms, stem, words } from '@/lib/sim/text';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Segmented, Slider } from './ui/controls';
import { StatusIcon } from './ui/StatusIcon';

const MODES = [
  { value: 'dense', label: 'Dense' },
  { value: 'lexical', label: 'BM25' },
  { value: 'hybrid', label: 'Hybrid (RRF)' },
  { value: 'hybridRerank', label: 'Hybrid + rerank' },
] as const satisfies readonly { value: RetrievalMode; label: string }[];

interface Preset {
  label: string;
  query: string;
  /** Text that only the chunk containing the answer includes. */
  answer: string;
}

const PRESETS: readonly Preset[] = [
  { label: 'Exact error code', query: 'what does ERR-4012 mean', answer: 'ERR-4012 means' },
  { label: 'Paraphrase', query: 'How long until my history is purged?', answer: 'Request logs are kept' },
  { label: 'Billing question', query: 'money back on a yearly subscription', answer: 'Annual plans can be refunded' },
  { label: 'Status code', query: 'too many requests 429', answer: 'HTTP 429' },
];

function HighlightedChunk({ text, queryTerms }: { text: string; queryTerms: Set<string> }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const w of words(text)) {
    if (!queryTerms.has(stem(w.text))) continue;
    parts.push(text.slice(cursor, w.start));
    parts.push(
      <mark key={w.start} className="rounded-sm bg-mark px-0.5 text-mark-ink">
        {text.slice(w.start, w.end)}
      </mark>,
    );
    cursor = w.end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export default function HybridSearchLab() {
  const queryId = useId();
  const sourceId = useId();
  const [source, setSource] = useState(HANDBOOK);
  const [strategy, setStrategy] = useState<ChunkStrategy>('recursive');
  const [size, setSize] = useState(60);
  const [overlap, setOverlap] = useState(0);
  const [query, setQuery] = useState(PRESETS[0].query);
  const [mode, setMode] = useState<RetrievalMode>('hybridRerank');
  const [topK, setTopK] = useState(3);

  const effectiveOverlap = Math.min(overlap, size - 1);
  const chunks = useMemo(
    () => CHUNKERS[strategy](source, { size, overlap: effectiveOverlap, similarityThreshold: 0.3 }),
    [source, strategy, size, effectiveOverlap],
  );
  const texts = useMemo(() => chunks.map((c) => c.text), [chunks]);

  const preset = PRESETS.find((p) => p.query === query);
  const isAnswer = (index: number) => preset !== undefined && texts[index].includes(preset.answer);

  const results = retrieve(texts, query, mode, topK);
  const denseRanks = new Map(denseSearch(texts, query).map((h, i) => [h.index, i + 1]));
  const lexicalRanks = new Map(bm25Search(texts, query).map((h, i) => [h.index, i + 1]));
  const queryTerms = new Set(contentTerms(query));

  return (
    <LabFrame
      title="RAG Chunking & Hybrid Search Lab"
      description="Chunk a knowledge base, then compare dense, BM25, hybrid and reranked retrieval on queries that trip up each method."
    >
      <details>
        <summary className="cursor-pointer font-medium text-graphite-800 dark:text-graphite-200">
          Edit the knowledge base <span className="text-xs font-normal text-muted">(paste your own text)</span>
        </summary>
        <label htmlFor={sourceId} className="sr-only">
          Knowledge base text
        </label>
        <textarea
          id={sourceId}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-lg border border-graphite-200 bg-graphite-50 p-3 font-mono text-xs dark:border-graphite-800 dark:bg-graphite-900"
        />
      </details>

      <LabSection title={`1 · Chunking (${chunks.length} chunks indexed)`}>
        <div className="grid gap-5 md:grid-cols-3">
          <Segmented label="Strategy" value={strategy} onChange={setStrategy} options={CHUNK_STRATEGIES} />
          <Slider label="Chunk size" value={size} min={16} max={240} step={4} onChange={setSize} format={(v) => `${v} tokens`} />
          <Slider
            label="Overlap"
            value={strategy === 'semantic' ? 0 : effectiveOverlap}
            min={0}
            max={Math.floor(size / 2)}
            step={2}
            onChange={setOverlap}
            format={(v) => (strategy === 'semantic' ? 'n/a' : `${v} tokens`)}
          />
        </div>
      </LabSection>

      <LabSection title="2 · Query">
        <label htmlFor={queryId} className="sr-only">
          Search query
        </label>
        <input
          id={queryId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 font-mono text-xs dark:border-graphite-800 dark:bg-graphite-900"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setQuery(p.query)}
              aria-pressed={p.query === query}
              className="rounded-full border border-graphite-200 px-2.5 py-0.5 text-xs text-graphite-600 hover:border-teal-400 aria-pressed:border-teal-500 aria-pressed:bg-teal-50 aria-pressed:text-teal-700 dark:border-graphite-700 dark:text-graphite-400 dark:aria-pressed:bg-teal-950 dark:aria-pressed:text-teal-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </LabSection>

      <div className="grid gap-5 md:grid-cols-[1fr_14rem]">
        <Segmented label="3 · Retrieval method" value={mode} onChange={setMode} options={MODES} />
        <Slider label="Top-k" value={topK} min={1} max={5} step={1} onChange={setTopK} />
      </div>

      {preset && (
        <div role="status" className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted">Answer chunk in top-{topK}?</span>
          {MODES.map((m) => {
            const found = retrieve(texts, query, m.value, topK).some((h) => isAnswer(h.index));
            return (
              <span
                key={m.value}
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
                  found
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                <StatusIcon status={found ? 'pass' : 'fail'} className="size-3" />
                {m.label}
                <span className="sr-only">{found ? ': found' : ': missed'}</span>
              </span>
            );
          })}
        </div>
      )}

      <LabSection title="4 · Retrieved chunks">
        {results.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rose-300 p-4 text-rose-700 dark:border-rose-900 dark:text-rose-400">
            Nothing retrieved. The query shares no words (BM25) or recognised concepts (dense) with any chunk.
          </p>
        ) : (
          <ol className="space-y-3">
            {results.map((hit, rank) => (
              <li
                key={hit.index}
                className={`rounded-lg border p-3 ${
                  isAnswer(hit.index)
                    ? 'border-emerald-400 dark:border-emerald-700'
                    : 'border-graphite-200 dark:border-graphite-800'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="font-semibold text-heading">#{rank + 1}</span>
                  <span className="font-mono">score {hit.score.toFixed(mode === 'hybrid' ? 4 : 3)}</span>
                  <span>chunk {hit.index + 1}</span>
                  <span>dense rank {denseRanks.get(hit.index) ?? '—'}</span>
                  <span>BM25 rank {lexicalRanks.get(hit.index) ?? '—'}</span>
                  {isAnswer(hit.index) && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      contains the answer
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  <HighlightedChunk text={texts[hit.index].trim()} queryTerms={queryTerms} />
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted">
          Highlighted words match query terms after stemming. Dense scores come from the 12-concept toy embedding; the
          reranker is a simulated cross-encoder.
        </p>
      </LabSection>
    </LabFrame>
  );
}
