import { useId, useMemo, useState } from 'react';
import { EMBEDDING_CORPUS, type CorpusSentence } from '@/lib/sim/corpus';
import { cosine, DIMENSIONS, dot, embed, norm, project2d } from '@/lib/sim/embeddings';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Segmented, Stat } from './ui/controls';

type Metric = 'cosine' | 'dot';

const METRICS = [
  { value: 'cosine', label: 'Cosine similarity' },
  { value: 'dot', label: 'Dot product (raw vectors)' },
] as const;

const SUGGESTIONS = ['a pet that needs the vet', 'python', 'refund price', 'bank', 'slow API timeout', 'ERR-4012'];

const TOPIC_COLORS: Record<CorpusSentence['topic'], string> = {
  pets: 'fill-amber-500 text-amber-500',
  food: 'fill-rose-500 text-rose-500',
  money: 'fill-emerald-500 text-emerald-500',
  code: 'fill-sky-500 text-sky-500',
  travel: 'fill-violet-500 text-violet-500',
  ambiguous: 'fill-graphite-500 text-muted',
};

const SIZE = 320;
const PAD = 24;

export default function EmbeddingExplorer() {
  const inputId = useId();
  const [query, setQuery] = useState('a pet that needs the vet');
  const [metric, setMetric] = useState<Metric>('cosine');

  const queryEmbedding = useMemo(() => embed(query), [query]);
  const corpusVectors = useMemo(() => EMBEDDING_CORPUS.map((s) => embed(s.text).vector), []);

  const ranked = EMBEDDING_CORPUS.map((sentence, i) => ({
    sentence,
    magnitude: norm(corpusVectors[i]),
    score: metric === 'cosine' ? cosine(queryEmbedding.vector, corpusVectors[i]) : dot(queryEmbedding.vector, corpusVectors[i]),
  })).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(1e-9, ...ranked.map((r) => r.score));
  const topIds = new Set(ranked.slice(0, 3).filter((r) => r.score > 0).map((r) => r.sentence.id));

  // Project corpus + query together so the query lands in the same 2-D space.
  const points = useMemo(() => {
    const projected = project2d([...corpusVectors, queryEmbedding.vector]);
    const xs = projected.map((p) => p[0]);
    const ys = projected.map((p) => p[1]);
    const scale = (v: number, min: number, max: number) => PAD + ((v - min) / (max - min || 1)) * (SIZE - 2 * PAD);
    return projected.map(([x, y]) => [
      scale(x, Math.min(...xs), Math.max(...xs)),
      SIZE - scale(y, Math.min(...ys), Math.max(...ys)),
    ]);
  }, [corpusVectors, queryEmbedding]);
  const queryPoint = points[points.length - 1];
  const queryIsEmpty = norm(queryEmbedding.vector) === 0;
  const maxDimension = Math.max(1, ...queryEmbedding.vector);

  return (
    <LabFrame
      title="Embedding Space Explorer"
      description="Embed a query with a small model whose 12 dimensions are named concepts, then rank sentences by cosine similarity or raw dot product."
    >
      <div>
        <label htmlFor={inputId} className="mb-1.5 block font-medium text-graphite-800 dark:text-graphite-200">
          Query
        </label>
        <input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2 font-mono text-xs dark:border-graphite-800 dark:bg-graphite-900"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded-full border border-graphite-200 px-2.5 py-0.5 text-xs text-graphite-600 hover:border-teal-400 hover:text-teal-600 dark:border-graphite-700 dark:text-graphite-400 dark:hover:text-teal-400"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <LabSection title="Query vector (one bar per concept dimension)">
        <div className="grid grid-cols-6 gap-x-3 gap-y-2 sm:grid-cols-12">
          {DIMENSIONS.map((dimension, i) => (
            <div key={dimension} className="text-center">
              <div className="relative mx-auto h-16 w-full max-w-8 rounded-sm bg-graphite-100 dark:bg-graphite-900">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-sm bg-teal-500 transition-[height] duration-300"
                  style={{ height: `${(queryEmbedding.vector[i] / maxDimension) * 100}%` }}
                />
              </div>
              <p className="mt-1 truncate text-[10px] text-muted" title={dimension}>
                {dimension}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Recognised: <span className="font-mono text-graphite-700 dark:text-graphite-300">{queryEmbedding.known.join(', ') || '—'}</span>
          {queryEmbedding.unknown.length > 0 && (
            <>
              {' '}
              · Unknown (no signal):{' '}
              <span className="font-mono text-rose-600 dark:text-rose-400">{queryEmbedding.unknown.join(', ')}</span>
            </>
          )}
        </p>
      </LabSection>

      <Segmented label="Similarity metric" value={metric} onChange={setMetric} options={METRICS} />

      <div className="grid gap-6 md:grid-cols-[20rem_1fr]">
        <figure>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full rounded-lg border border-graphite-200 dark:border-graphite-800"
            role="img"
            aria-label="Sentences projected onto two dimensions, with the query and lines to its three nearest neighbours"
          >
            {!queryIsEmpty &&
              EMBEDDING_CORPUS.map((s, i) =>
                topIds.has(s.id) ? (
                  <line
                    key={`l${s.id}`}
                    x1={queryPoint[0]}
                    y1={queryPoint[1]}
                    x2={points[i][0]}
                    y2={points[i][1]}
                    className="stroke-teal-400"
                    strokeDasharray="3 3"
                  />
                ) : null,
              )}
            {EMBEDDING_CORPUS.map((s, i) => (
              <g key={s.id} className={TOPIC_COLORS[s.topic]}>
                <circle cx={points[i][0]} cy={points[i][1]} r={6} />
                <text x={points[i][0] + 9} y={points[i][1] + 4} className="fill-graphite-500 text-[10px]">
                  {s.id}
                </text>
              </g>
            ))}
            {!queryIsEmpty && (
              <g className="fill-teal-600 dark:fill-teal-400">
                <rect x={queryPoint[0] - 7} y={queryPoint[1] - 7} width={14} height={14} transform={`rotate(45 ${queryPoint[0]} ${queryPoint[1]})`} />
                <text x={queryPoint[0] + 11} y={queryPoint[1] - 8} className="text-[11px] font-semibold">
                  query
                </text>
              </g>
            )}
          </svg>
          <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {Object.entries(TOPIC_COLORS).map(([topic, color]) => (
              <span key={topic} className="flex items-center gap-1">
                <span className={`size-2 rounded-full bg-current ${color}`} aria-hidden="true" />
                {topic}
              </span>
            ))}
            <span>· 2-D PCA projection: distances are approximate</span>
          </figcaption>
        </figure>

        <div>
          <table className="w-full text-xs">
            <caption className="sr-only">Sentences ranked by similarity to the query</caption>
            <thead className="text-left text-muted">
              <tr>
                <th scope="col" className="pb-2 font-medium">
                  Sentence
                </th>
                <th scope="col" className="w-28 pb-2 font-medium">
                  {metric === 'cosine' ? 'Cosine' : 'Dot product'}
                </th>
                <th scope="col" className="w-12 pb-2 text-right font-medium">
                  ‖v‖
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ sentence, score, magnitude }) => (
                <tr key={sentence.id} className="align-top">
                  <td className="py-1 pr-3">
                    <span className="mr-1 font-mono text-muted">{sentence.id}</span>
                    {sentence.text}
                  </td>
                  <td className="py-1">
                    <div className="h-3 rounded-sm bg-graphite-100 dark:bg-graphite-900">
                      <div
                        className="h-3 rounded-sm bg-teal-500 transition-[width] duration-300"
                        style={{ width: `${Math.max(0, score / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-muted">{score.toFixed(2)}</span>
                  </td>
                  <td className="py-1 text-right font-mono text-muted">{magnitude.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Top match" value={queryIsEmpty ? '—' : ranked[0].sentence.id} />
        <Stat label="Query magnitude" value={norm(queryEmbedding.vector).toFixed(2)} />
        <Stat
          label="Recognised words"
          value={`${queryEmbedding.known.length} / ${queryEmbedding.known.length + queryEmbedding.unknown.length}`}
          tone={queryIsEmpty ? 'bad' : 'default'}
        />
      </dl>
    </LabFrame>
  );
}
