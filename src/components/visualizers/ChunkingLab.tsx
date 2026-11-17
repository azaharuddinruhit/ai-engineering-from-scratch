import { useId, useMemo, useState } from 'react';
import { CHUNK_STRATEGIES, CHUNKERS, chunkStats, type Chunk, type ChunkStrategy } from '@/lib/sim/chunking';
import { HANDBOOK } from '@/lib/sim/corpus';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Segmented, Slider, Stat } from './ui/controls';

const CHUNK_COLORS = [
  // Four steps along viridis (violet, blue, teal, green) so neighbouring chunks never share a tint.
  'bg-violet-100 dark:bg-violet-950',
  'bg-sky-100 dark:bg-sky-950',
  'bg-teal-100 dark:bg-teal-950',
  'bg-lime-100 dark:bg-lime-950',
];
const OVERLAP_COLOR = 'bg-mark text-mark-ink';

interface Segment {
  start: number;
  end: number;
  covering: number[];
}

/** Splits the source wherever a chunk starts or ends, recording which chunks cover each piece. */
function coverageSegments(length: number, chunks: readonly Chunk[]): Segment[] {
  const cuts = [...new Set([0, length, ...chunks.flatMap((c) => [c.start, c.end])])].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, i) => {
    const end = cuts[i + 1];
    return { start, end, covering: chunks.flatMap((c, index) => (c.start <= start && c.end >= end ? [index] : [])) };
  });
}

function ChunkedText({ source, chunks }: { source: string; chunks: readonly Chunk[] }) {
  const starts = new Map(chunks.map((c, i) => [c.start, i]));
  return (
    <div className="max-h-96 overflow-y-auto rounded-lg border border-graphite-200 p-3 font-mono text-xs leading-6 whitespace-pre-wrap break-words dark:border-graphite-800">
      {coverageSegments(source.length, chunks).map((segment) => {
        const chunkStart = starts.get(segment.start);
        const color =
          segment.covering.length === 0
            ? ''
            : segment.covering.length > 1
              ? OVERLAP_COLOR
              : CHUNK_COLORS[segment.covering[0] % CHUNK_COLORS.length];
        return (
          <span key={segment.start}>
            {chunkStart !== undefined && (
              <sup className="mr-0.5 rounded bg-graphite-800 px-1 text-[9px] font-bold text-white dark:bg-graphite-200 dark:text-graphite-900">
                {chunkStart + 1}
              </sup>
            )}
            <span className={color}>{source.slice(segment.start, segment.end)}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function ChunkingLab() {
  const sourceId = useId();
  const [source, setSource] = useState(HANDBOOK);
  const [strategy, setStrategy] = useState<ChunkStrategy>('fixed');
  const [size, setSize] = useState(60);
  const [overlap, setOverlap] = useState(10);
  const [threshold, setThreshold] = useState(0.3);

  const effectiveOverlap = Math.min(overlap, size - 1);
  const chunks = useMemo(
    () => CHUNKERS[strategy](source, { size, overlap: effectiveOverlap, similarityThreshold: threshold }),
    [source, strategy, size, effectiveOverlap, threshold],
  );
  const stats = chunkStats(source, chunks);

  return (
    <LabFrame
      title="Chunking Lab"
      description="Split a handbook with three strategies and see exactly where each boundary falls. Overlapping text is highlighted in yellow."
    >
      <details className="group">
        <summary className="cursor-pointer font-medium text-graphite-800 dark:text-graphite-200">
          Edit the source document <span className="text-xs font-normal text-muted">(paste your own text)</span>
        </summary>
        <label htmlFor={sourceId} className="sr-only">
          Source document
        </label>
        <textarea
          id={sourceId}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-lg border border-graphite-200 bg-graphite-50 p-3 font-mono text-xs dark:border-graphite-800 dark:bg-graphite-900"
        />
      </details>

      <div className="grid gap-5 md:grid-cols-2">
        <Segmented label="Strategy" value={strategy} onChange={setStrategy} options={CHUNK_STRATEGIES} />
        <Slider label="Max chunk size" value={size} min={16} max={240} step={4} onChange={setSize} format={(v) => `${v} tokens`} />
        {strategy === 'semantic' ? (
          <Slider
            label="Topic-shift threshold"
            value={threshold}
            min={0}
            max={0.9}
            step={0.05}
            onChange={setThreshold}
            format={(v) => v.toFixed(2)}
            hint="Split where adjacent sentences' cosine similarity falls below this."
          />
        ) : (
          <Slider
            label="Overlap"
            value={effectiveOverlap}
            min={0}
            max={Math.floor(size / 2)}
            step={2}
            onChange={setOverlap}
            format={(v) => `${v} tokens`}
          />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Chunks" value={String(stats.count)} />
        <Stat label="Avg size" value={`${Math.round(stats.averageTokens)} tok`} hint={`${stats.minTokens}–${stats.maxTokens}`} />
        <Stat label="Overlap overhead" value={`+${Math.round(stats.overlapOverhead * 100)}%`} hint="extra tokens embedded" />
        <Stat
          label="Mid-sentence cuts"
          value={String(stats.brokenSentences)}
          tone={stats.brokenSentences === 0 ? 'good' : 'bad'}
        />
        <Stat label="Source size" value={`${source.length.toLocaleString()} ch`} />
      </dl>

      <LabSection title="Chunk boundaries">
        <ChunkedText source={source} chunks={chunks} />
      </LabSection>

      <LabSection title="Chunk sizes against the limit">
        <div
          className="flex h-20 items-end gap-0.5 border-t border-dashed border-graphite-300 dark:border-graphite-700"
          role="img"
          aria-label={`${chunks.length} chunks; bar height is size in tokens, the dashed line is the ${size}-token limit`}
        >
          {chunks.map((c, i) => (
            <div
              key={`${c.start}-${c.end}`}
              className={`flex-1 rounded-t-sm ring-1 ring-inset ring-black/10 dark:ring-white/10 ${CHUNK_COLORS[i % CHUNK_COLORS.length]}`}
              style={{ height: `${Math.min(100, (c.tokens / size) * 100)}%` }}
              title={`Chunk ${i + 1}: ${c.tokens} tokens`}
            />
          ))}
        </div>
      </LabSection>
    </LabFrame>
  );
}
