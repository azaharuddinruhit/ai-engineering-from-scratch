import { useState } from 'react';
import { contextBudget, positionOf, recallAtPosition, type BudgetSegment, type DocOrdering } from '@/lib/sim/contextWindow';
import { LabFrame, LabSection } from './ui/LabFrame';
import { LineChart } from './ui/LineChart';
import { Segmented, Slider, Stat } from './ui/controls';

const WINDOWS = [
  { value: '8000', label: '8K' },
  { value: '32000', label: '32K' },
  { value: '128000', label: '128K' },
  { value: '1000000', label: '1M' },
] as const;

const ORDERINGS = [
  { value: 'rank', label: 'Retrieval order' },
  { value: 'edgesFirst', label: 'Best at the edges' },
] as const;

const SYSTEM_TOKENS = 800;
const QUESTION_TOKENS = 150;
const OUTPUT_RESERVE_TOKENS = 2000;
const TOKENS_PER_EXAMPLE = 300;

const SEGMENT_COLORS: Record<BudgetSegment['id'], string> = {
  system: 'bg-violet-500',
  fewShot: 'bg-sky-500',
  docs: 'bg-teal-500',
  question: 'bg-emerald-500',
  output: 'bg-graphite-400 dark:bg-graphite-600',
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function ContextWindowLab() {
  const [windowSize, setWindowSize] = useState<(typeof WINDOWS)[number]['value']>('32000');
  const [docCount, setDocCount] = useState(20);
  const [docTokens, setDocTokens] = useState(800);
  const [examples, setExamples] = useState(3);
  const [goldRank, setGoldRank] = useState(10);
  const [ordering, setOrdering] = useState<DocOrdering>('rank');

  const windowTokens = Number(windowSize);
  const budget = contextBudget({
    windowTokens,
    systemTokens: SYSTEM_TOKENS,
    fewShotTokens: examples * TOKENS_PER_EXAMPLE,
    docTokens,
    docCount,
    questionTokens: QUESTION_TOKENS,
    outputReserveTokens: OUTPUT_RESERVE_TOKENS,
  });
  const fit = budget.docsThatFit;
  const rank = Math.min(goldRank, docCount) - 1;
  const goldDropped = rank >= fit;
  const goldPosition = goldDropped ? null : positionOf(rank, fit, ordering);
  const recall = goldPosition === null ? 0 : recallAtPosition(goldPosition, fit);

  // Prompt slots in order: each holds the retrieval rank of the doc placed there.
  const slots = Array.from({ length: fit }, () => 0);
  for (let r = 0; r < fit; r++) slots[positionOf(r, fit, ordering)] = r;

  const curvePoints = Array.from({ length: Math.max(fit, 1) }, (_, i) => ({
    x: i + 1,
    y: recallAtPosition(i, fit),
  }));

  return (
    <LabFrame
      title="Context Budget & Position Lab"
      description="Pack retrieved documents into a fixed window and see where the one that matters ends up, and whether the model will use it."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Segmented label="Context window" value={windowSize} onChange={setWindowSize} options={WINDOWS} />
        <Segmented label="Document ordering" value={ordering} onChange={setOrdering} options={ORDERINGS} />
        <Slider label="Retrieved documents" value={docCount} min={1} max={40} step={1} onChange={setDocCount} />
        <Slider
          label="Tokens per document"
          value={docTokens}
          min={200}
          max={4000}
          step={100}
          onChange={setDocTokens}
          format={(v) => v.toLocaleString()}
        />
        <Slider
          label="Few-shot examples"
          value={examples}
          min={0}
          max={10}
          step={1}
          onChange={setExamples}
          format={(v) => `${v} × ${TOKENS_PER_EXAMPLE} tokens`}
        />
        <Slider
          label="Retrieval rank of the answer document"
          value={Math.min(goldRank, docCount)}
          min={1}
          max={docCount}
          step={1}
          onChange={setGoldRank}
          format={(v) => `#${v}`}
          hint="Retrievers are imperfect: the answer is often not ranked first."
        />
      </div>

      <LabSection title="Token budget">
        <div
          className="flex h-6 overflow-hidden rounded-md bg-graphite-100 dark:bg-graphite-900"
          role="img"
          aria-label={`${budget.usedTokens.toLocaleString()} of ${windowTokens.toLocaleString()} tokens used`}
        >
          {budget.segments.map((s) => (
            <div
              key={s.id}
              className={`${SEGMENT_COLORS[s.id]} transition-[width] duration-300`}
              style={{ width: `${(s.tokens / windowTokens) * 100}%` }}
              title={`${s.label}: ${s.tokens.toLocaleString()} tokens`}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite-600 dark:text-graphite-400">
          {budget.segments.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${SEGMENT_COLORS[s.id]}`} aria-hidden="true" />
              {s.label} · {s.tokens.toLocaleString()}
            </li>
          ))}
        </ul>
        {budget.droppedDocs > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" role="status">
            {budget.droppedDocs} of {docCount} documents did not fit and were dropped (lowest-ranked first).
          </p>
        )}
      </LabSection>

      <LabSection title="What the model sees, in prompt order">
        <div className="flex flex-wrap gap-1" aria-label="Documents in prompt order">
          {slots.map((r, position) => (
            <span
              key={position}
              title={`Position ${position + 1}: retrieval rank #${r + 1}`}
              className={`grid h-7 min-w-7 place-items-center rounded px-1 font-mono text-[10px] ${
                r === rank
                  ? 'bg-mark font-bold text-mark-ink'
                  : 'bg-graphite-100 text-graphite-600 dark:bg-graphite-900 dark:text-graphite-400'
              }`}
            >
              {r + 1}
            </span>
          ))}
          {goldDropped && (
            <span className="ml-2 grid h-7 place-items-center rounded border border-dashed border-rose-400 px-2 font-mono text-[10px] text-rose-600 dark:text-rose-400">
              #{rank + 1} dropped
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Numbers are retrieval ranks. The answer document is highlighted.</p>
      </LabSection>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_12rem]">
        <LineChart
          title="Estimated recall by position of the answer document"
          x={{
            scale: 'linear',
            domain: [1, Math.max(fit, 2)],
            ticks: [...new Set([1, Math.max(1, Math.round(fit / 2)), Math.max(fit, 2)])],
            format: String,
            label: 'Position in context',
          }}
          y={{ scale: 'linear', domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1], format: pct, label: 'Recall' }}
          series={[
            { id: 'recall', label: 'Recall at each position (illustrative)', points: curvePoints, className: 'stroke-teal-500 text-teal-500' },
          ]}
          markers={
            goldPosition === null ? [] : [{ x: goldPosition + 1, y: recall, label: 'Answer document', className: 'text-amber-500' }]
          }
        />
        <dl className="grid gap-3">
          <Stat label="Docs in context" value={`${fit} / ${docCount}`} />
          <Stat
            label="Answer position"
            value={goldPosition === null ? '—' : `${goldPosition + 1} of ${fit}`}
            hint={goldDropped ? 'dropped before the model saw it' : undefined}
            tone={goldDropped ? 'bad' : 'default'}
          />
          <Stat label="Estimated recall" value={pct(recall)} tone={recall >= 0.8 ? 'good' : 'bad'} />
        </dl>
      </div>
    </LabFrame>
  );
}
