import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createRng } from '@/lib/sim/rng';
import { applySampling, entropyBits, sampleIndex, type Candidate } from '@/lib/sim/sampling';
import { tokenize } from '@/lib/sim/tokenizer';
import { formatUsd, PRICE_TIERS, requestCostUsd } from '@/lib/sim/pricing';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Button, Segmented, Slider, Stat } from './ui/controls';

interface Preset {
  id: string;
  label: string;
  prompt: string;
  candidates: Candidate[];
}

/** Hand-tuned next-token logits that mimic how real models distribute probability in each situation. */
const PRESETS: readonly Preset[] = [
  {
    id: 'fact',
    label: 'Factual',
    prompt: 'The capital of France is',
    candidates: [
      { token: ' Paris', logit: 9.2 },
      { token: ' a', logit: 5.6 },
      { token: ' located', logit: 5.0 },
      { token: ' the', logit: 4.6 },
      { token: ' known', logit: 4.1 },
      { token: ' one', logit: 3.6 },
      { token: ' not', logit: 2.9 },
      { token: ' Lyon', logit: 2.0 },
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    prompt: 'A one-word name for a cosy coffee shop:',
    candidates: [
      { token: ' Brew', logit: 4.1 },
      { token: ' Bean', logit: 3.9 },
      { token: ' Grind', logit: 3.7 },
      { token: ' Roast', logit: 3.4 },
      { token: ' Ember', logit: 3.1 },
      { token: ' Hearth', logit: 2.9 },
      { token: ' Mocha', logit: 2.6 },
      { token: ' Nook', logit: 2.4 },
      { token: ' Perk', logit: 2.2 },
      { token: ' Kettle', logit: 1.9 },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    prompt: 'def fibonacci(n):\n    if n',
    candidates: [
      { token: ' <=', logit: 7.4 },
      { token: ' <', logit: 6.6 },
      { token: ' ==', logit: 5.8 },
      { token: ' in', logit: 3.2 },
      { token: ' is', logit: 2.6 },
      { token: ' >', logit: 2.1 },
      { token: ':', logit: 1.4 },
    ],
  },
  {
    id: 'json',
    label: 'JSON value',
    prompt: 'Extract the age as JSON. Text: "Ada, 36, joined in 2021."\n{"age":',
    candidates: [
      { token: ' 36', logit: 8.1 },
      { token: '36', logit: 7.2 },
      { token: ' "', logit: 4.4 },
      { token: ' 2021', logit: 3.1 },
      { token: ' null', logit: 2.5 },
      { token: ' thirty', logit: 1.6 },
    ],
  },
];

const DEFAULT_TEXT =
  'AI engineers treat language models as non-deterministic components. Tokenization decides what you pay: ' +
  'internationalization costs more than cat, getUserById splits into pieces, 1234567 groups into 3-digit chunks, ' +
  'and こんにちは costs roughly a token per character. 🚀';

const TOKEN_COLORS = [
  'bg-teal-100 dark:bg-teal-950',
  'bg-emerald-100 dark:bg-emerald-950',
  'bg-amber-100 dark:bg-amber-950',
  'bg-rose-100 dark:bg-rose-950',
  'bg-sky-100 dark:bg-sky-950',
  'bg-violet-100 dark:bg-violet-950',
];

const MAX_RENDERED_TOKENS = 600;
const BATCH_SAMPLES = 1000;

const showWhitespace = (token: string) => token.replace(/ /g, '·').replace(/\n/g, '↵\n').replace(/\t/g, '→');
const percent = (p: number) => `${(p * 100).toFixed(p > 0 && p < 0.001 ? 2 : 1)}%`;

function TokenizerPanel() {
  const inputId = useId();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [tierId, setTierId] = useState('mid');
  const [outputTokens, setOutputTokens] = useState(500);

  const tokens = useMemo(() => tokenize(text), [text]);
  const tier = PRICE_TIERS.find((t) => t.id === tierId)!;
  const perRequest = requestCostUsd(tokens.length, outputTokens, tier);

  return (
    <LabSection title="1 · Tokenize and price a prompt">
      <label htmlFor={inputId} className="sr-only">
        Prompt text
      </label>
      <textarea
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-graphite-200 bg-graphite-50 p-3 font-mono text-xs leading-relaxed dark:border-graphite-800 dark:bg-graphite-900"
      />
      <div
        className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-graphite-200 p-3 font-mono text-xs leading-7 whitespace-pre-wrap break-words dark:border-graphite-800"
        aria-label="Token boundaries"
      >
        {tokens.slice(0, MAX_RENDERED_TOKENS).map((token, i) => (
          <span key={i} className={`rounded-sm px-px ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`} title={`Token ${i + 1}`}>
            {showWhitespace(token)}
          </span>
        ))}
        {tokens.length > MAX_RENDERED_TOKENS && (
          <span className="text-muted"> … {tokens.length - MAX_RENDERED_TOKENS} more</span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Illustrative BPE-style tokenizer: · marks a space that belongs to the next token. Real tokenizers differ per
        model, so measure with your provider's token-counting endpoint.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Segmented
          label="Model class"
          value={tierId}
          onChange={setTierId}
          options={PRICE_TIERS.map((t) => ({ value: t.id, label: t.label }))}
        />
        <Slider
          label="Expected output length"
          value={outputTokens}
          min={0}
          max={4000}
          step={50}
          onChange={setOutputTokens}
          format={(v) => `${v} tokens`}
          hint="Output tokens cost several times more than input tokens."
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Characters" value={text.length.toLocaleString()} />
        <Stat
          label="Input tokens"
          value={tokens.length.toLocaleString()}
          hint={tokens.length ? `${(text.length / tokens.length).toFixed(1)} chars/token` : undefined}
        />
        <Stat label="Cost per request" value={formatUsd(perRequest)} hint={`$${tier.inputPerMTok} / $${tier.outputPerMTok} per 1M`} />
        <Stat label="Cost per 1M requests" value={formatUsd(perRequest * 1_000_000)} />
      </dl>
    </LabSection>
  );
}

function SamplingPanel() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [temperature, setTemperature] = useState(1);
  const [topK, setTopK] = useState(0);
  const [topP, setTopP] = useState(1);
  const [seed, setSeed] = useState(42);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [lastPick, setLastPick] = useState<number | null>(null);
  const rng = useRef(createRng(seed));

  const preset = PRESETS.find((p) => p.id === presetId)!;
  const scored = useMemo(
    () => applySampling(preset.candidates, { temperature, topK, topP }),
    [preset, temperature, topK, topP],
  );

  // Any change to the distribution or seed invalidates previous draws.
  useEffect(() => {
    rng.current = createRng(seed);
    setCounts(null);
    setLastPick(null);
  }, [scored, seed]);

  const sampleOnce = () => setLastPick(sampleIndex(scored, rng.current));
  const sampleBatch = () => {
    const tally = scored.map(() => 0);
    for (let i = 0; i < BATCH_SAMPLES; i++) tally[sampleIndex(scored, rng.current)]++;
    setCounts(tally);
  };

  const keptCount = scored.filter((c) => c.kept).length;
  const entropy = entropyBits(scored.map((c) => c.probability));

  return (
    <LabSection title="2 · Shape the next-token distribution">
      <Segmented
        label="Scenario"
        value={presetId}
        onChange={setPresetId}
        options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
      />
      <pre className="mt-3 overflow-x-auto rounded-lg bg-graphite-50 p-3 font-mono text-xs whitespace-pre-wrap dark:bg-graphite-900">
        {preset.prompt}
        {lastPick !== null && (
          <mark className="rounded-sm bg-teal-200 px-0.5 text-teal-900 dark:bg-teal-800 dark:text-teal-50">
            {scored[lastPick].token}
          </mark>
        )}
        <span className="animate-pulse text-teal-500" aria-hidden="true">
          ▍
        </span>
      </pre>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Slider
          label="Temperature"
          value={temperature}
          min={0}
          max={2}
          step={0.05}
          onChange={setTemperature}
          format={(v) => (v === 0 ? '0 (greedy)' : v.toFixed(2))}
        />
        <Slider
          label="Top-k"
          value={topK}
          min={0}
          max={10}
          step={1}
          onChange={setTopK}
          format={(v) => (v === 0 ? 'off' : String(v))}
        />
        <Slider
          label="Top-p (nucleus)"
          value={topP}
          min={0.05}
          max={1}
          step={0.05}
          onChange={setTopP}
          format={(v) => (v >= 1 ? '1.00 (off)' : v.toFixed(2))}
        />
      </div>

      <table className="mt-6 w-full table-fixed text-xs">
        <caption className="sr-only">Next-token candidates with raw and final probabilities</caption>
        <thead className="text-left text-muted">
          <tr>
            <th scope="col" className="w-24 pb-2 font-medium">
              Token
            </th>
            <th scope="col" className="pb-2 font-medium">
              Probability <span className="font-normal">(outline = raw model belief at T=1)</span>
            </th>
            <th scope="col" className="w-16 pb-2 text-right font-medium">
              Final
            </th>
            {counts && (
              <th scope="col" className="w-20 pb-2 text-right font-medium">
                Observed
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {scored.map((c, i) => (
            <tr key={c.token} className={c.kept ? '' : 'opacity-45'}>
              <td className={`py-1 pr-2 font-mono ${c.kept ? '' : 'line-through'}`}>{showWhitespace(c.token)}</td>
              <td className="py-1">
                <div className="relative h-4 rounded-sm bg-graphite-100 dark:bg-graphite-900">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm border border-graphite-400 dark:border-graphite-600"
                    style={{ width: `${c.baseProbability * 100}%` }}
                  />
                  <div
                    className={`absolute inset-y-0.5 left-0 rounded-sm transition-[width] duration-300 ${
                      i === lastPick ? 'bg-mark' : 'bg-teal-500'
                    }`}
                    style={{ width: `${c.probability * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-1 text-right font-mono">{c.kept ? percent(c.probability) : 'filtered'}</td>
              {counts && <td className="py-1 text-right font-mono">{percent(counts[i] / BATCH_SAMPLES)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={sampleOnce}>Sample next token</Button>
        <Button variant="secondary" onClick={sampleBatch}>
          Sample {BATCH_SAMPLES.toLocaleString()}×
        </Button>
        <Button variant="secondary" onClick={() => setSeed((s) => s + 1)}>
          New seed
        </Button>
        <span className="font-mono text-xs text-muted">seed {seed}</span>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Candidates kept" value={`${keptCount} / ${scored.length}`} />
        <Stat label="Top token" value={percent(scored[0].probability)} />
        <Stat
          label="Entropy"
          value={`${entropy.toFixed(2)} bits`}
          hint={entropy < 0.01 ? 'deterministic' : entropy < 1 ? 'focused' : 'diverse'}
        />
      </dl>
    </LabSection>
  );
}

export default function TokenSamplingSimulator() {
  return (
    <LabFrame
      title="Token & Sampling Simulator"
      description="See how text becomes billable tokens, then bend the next-token distribution with temperature, top-k and top-p."
    >
      <TokenizerPanel />
      <SamplingPanel />
    </LabFrame>
  );
}
