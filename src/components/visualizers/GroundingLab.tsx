import { useId, useState } from 'react';
import { GROUNDING_ANSWERS, GROUNDING_QUESTION, GROUNDING_SOURCES } from '@/lib/sim/corpus';
import { checkAnswer, type SentenceCheck, type Verdict } from '@/lib/sim/grounding';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Segmented, Slider, Stat } from './ui/controls';

const VERDICTS: Record<Verdict, { label: string; className: string }> = {
  supported: { label: 'Supported', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  misattributed: { label: 'Wrong citation', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  number_mismatch: { label: 'Figure not in source', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  unsupported: { label: 'Unsupported', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  uncited: { label: 'No citation', className: 'bg-graphite-200 text-graphite-700 dark:bg-graphite-800 dark:text-graphite-300' },
};

function explain(check: SentenceCheck): string {
  switch (check.verdict) {
    case 'supported':
      return `Cited source covers ${Math.round(check.support * 100)}% of the claim's terms.`;
    case 'number_mismatch':
      return `The cited source never mentions ${check.missingNumbers.join(', ')}.`;
    case 'misattributed':
      return `Source [${check.betterSourceId}] supports this, not the one cited.`;
    case 'unsupported':
      return `Only ${Math.round(check.support * 100)}% of the claim's terms appear in the cited source.`;
    case 'uncited':
      return 'Every factual sentence must cite a retrieved source.';
  }
}

export default function GroundingLab() {
  const answerId = useId();
  const [presetId, setPresetId] = useState<string>(GROUNDING_ANSWERS[0].id);
  const [answer, setAnswer] = useState<string>(GROUNDING_ANSWERS[0].text);
  const [threshold, setThreshold] = useState(0.6);

  const report = checkAnswer(answer, GROUNDING_SOURCES, threshold);

  const choosePreset = (id: string) => {
    setPresetId(id);
    setAnswer(GROUNDING_ANSWERS.find((a) => a.id === id)!.text);
  };

  return (
    <LabFrame
      title="Citation & Grounding Checker"
      description="Check every sentence of a generated answer against the sources it cites: content terms, exact figures and citation targets."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <LabSection title="Question">
          <p className="rounded-lg bg-graphite-50 p-3 text-xs dark:bg-graphite-900">{GROUNDING_QUESTION}</p>
        </LabSection>
        <LabSection title="Retrieved sources">
          <ol className="space-y-2">
            {GROUNDING_SOURCES.map((source) => (
              <li key={source.id} className="flex gap-2 rounded-lg bg-graphite-50 p-2.5 text-xs leading-relaxed dark:bg-graphite-900">
                <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">[{source.id}]</span>
                <span>{source.text}</span>
              </li>
            ))}
          </ol>
        </LabSection>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
        <Segmented
          label="Generated answer"
          value={presetId}
          onChange={choosePreset}
          options={GROUNDING_ANSWERS.map((a) => ({ value: a.id, label: a.label }))}
        />
        <Slider
          label="Support threshold"
          value={threshold}
          min={0.3}
          max={0.9}
          step={0.05}
          onChange={setThreshold}
          format={(v) => `${Math.round(v * 100)}%`}
          hint="Share of a claim's terms its source must contain."
        />
      </div>

      <div>
        <label htmlFor={answerId} className="mb-1.5 block text-xs text-muted">
          Edit the answer to test your own claims. Cite sources as [1], [2], [3].
        </label>
        <textarea
          id={answerId}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 p-3 text-xs leading-relaxed dark:border-graphite-800 dark:bg-graphite-900"
        />
      </div>

      <LabSection title="Sentence-by-sentence verdicts">
        <ol className="space-y-2" aria-live="polite">
          {report.sentences.map((check, i) => {
            const verdict = VERDICTS[check.verdict];
            return (
              <li key={i} className="rounded-lg border border-graphite-200 p-3 dark:border-graphite-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs leading-relaxed">{check.text}</p>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${verdict.className}`}>{verdict.label}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted">{explain(check)}</p>
                {check.verdict !== 'supported' && check.missingTerms.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Terms not found:{' '}
                    <span className="font-mono text-rose-600 dark:text-rose-400">{check.missingTerms.join(', ')}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </LabSection>

      <dl className="grid grid-cols-3 gap-3">
        <Stat
          label="Faithfulness"
          value={`${Math.round(report.faithfulness * 100)}%`}
          tone={report.faithfulness === 1 ? 'good' : 'bad'}
          hint="supported sentences / all sentences"
        />
        <Stat label="Sentences" value={String(report.sentences.length)} />
        <Stat
          label="Action"
          value={report.faithfulness === 1 ? 'Ship' : 'Block or regenerate'}
          tone={report.faithfulness === 1 ? 'good' : 'bad'}
        />
      </dl>
    </LabFrame>
  );
}
