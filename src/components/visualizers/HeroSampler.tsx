import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { divergence, LEDE, LEDE_DEFAULTS, sampleLede } from '@/lib/sim/ledeSampler';
import { Button, Slider } from './ui/controls';

interface HeroSamplerProps {
  /** Lesson that explains real decoding, linked from the panel. */
  decodingLessonHref: string;
  /** Calls to action, rendered under the sentence. */
  children?: ReactNode;
}

const INITIAL_FOCUS = 9; // " non-deterministic": the most contested position in the sentence.
const percent = (p: number) => `${(p * 100).toFixed(p >= 0.1 ? 0 : 1)}%`;

/** Splits a token's leading space off so only the word itself is highlighted. */
const splitSpace = (token: string) => {
  const word = token.trimStart();
  return { space: token.slice(0, token.length - word.length), word };
};

/** The home page's opening sentence, generated live by a scripted next-token model. */
export default function HeroSampler({ decodingLessonHref, children }: HeroSamplerProps) {
  const [temperature, setTemperature] = useState<number>(LEDE_DEFAULTS.temperature);
  const [seed, setSeed] = useState<number>(LEDE_DEFAULTS.seed);
  const [inspected, setInspected] = useState(INITIAL_FOCUS);

  const tokens = useMemo(() => sampleLede(temperature, seed), [temperature, seed]);
  const changed = divergence(tokens);
  const current = tokens[inspected];
  const before = tokens
    .slice(Math.max(0, inspected - 3), inspected)
    .map((t) => t.candidates[t.chosen].token)
    .join('')
    .trim();
  const isDefault = temperature === LEDE_DEFAULTS.temperature && seed === LEDE_DEFAULTS.seed;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? LEDE.length - 1 : step && inspected + step;
    if (target === undefined || target < 0 || target >= LEDE.length) return;
    event.preventDefault();
    setInspected(target);
    (event.currentTarget.parentElement?.querySelectorAll('button')[target] as HTMLButtonElement | undefined)?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-16">
      <div>
        {/* Re-keyed on each new draw (not on temperature drags) so the generation sweep replays as feedback. */}
        <p
          key={seed}
          role="group"
          aria-label="Generated sentence. Use the arrow keys to inspect each token."
          className="text-2xl leading-[1.45] text-graphite-700 sm:text-[1.75rem] dark:text-graphite-300"
        >
          {tokens.map((t, i) => {
            const { space, word } = splitSpace(t.candidates[t.chosen].token);
            const surprising = t.chosen !== 0;
            return (
              <span key={i}>
                {space}
                <button
                  type="button"
                  tabIndex={i === inspected ? 0 : -1}
                  aria-pressed={i === inspected}
                  aria-label={`${word}: ${percent(t.candidates[t.chosen].probability)}${surprising ? ', not the most likely token' : ''}`}
                  onClick={() => setInspected(i)}
                  onMouseEnter={() => setInspected(i)}
                  onFocus={() => setInspected(i)}
                  onKeyDown={onKeyDown}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={[
                    'sample-sweep cursor-pointer rounded-sm px-0.5 -mx-0.5 underline decoration-teal-500/40 decoration-1 underline-offset-[0.3em] transition-colors',
                    'aria-pressed:decoration-teal-600 aria-pressed:decoration-2 dark:aria-pressed:decoration-teal-300',
                    surprising ? 'bg-mark text-mark-ink' : 'hover:text-heading',
                  ].join(' ')}
                >
                  {word}
                </button>
              </span>
            );
          })}
        </p>
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          {changed === 0
            ? 'Every word is the model’s most likely choice. Raise the temperature and draw again.'
            : `${changed} of ${LEDE.length} words are not the most likely choice. They are highlighted.`}
        </p>
        {children}
      </div>

      <aside
        aria-label="Next-token probabilities"
        className="rounded-xl border border-graphite-200 bg-white p-5 text-sm dark:border-graphite-800 dark:bg-graphite-900"
      >
        <h2 className="font-semibold text-heading">Next-token probabilities</h2>
        <p className="mt-1 text-muted">
          Word {inspected + 1} of {LEDE.length}, after <span className="text-graphite-700 dark:text-graphite-300">“{before ? `…${before}` : 'the start'}”</span>
        </p>

        <ol className="mt-4 space-y-2">
          {current.candidates.map((c, i) => {
            const drawn = i === current.chosen;
            return (
              <li key={c.token} className="grid grid-cols-[minmax(0,8.5rem)_1fr_3rem] items-center gap-3">
                <span className={`truncate font-mono text-xs ${drawn ? 'font-semibold text-heading' : 'text-graphite-600 dark:text-graphite-400'}`}>
                  {c.token.trim()}
                  {drawn && <span className="sr-only"> (drawn)</span>}
                </span>
                <span className="h-2 rounded-full bg-graphite-100 dark:bg-graphite-800" aria-hidden="true">
                  <span
                    className={`block h-full rounded-full transition-[width] duration-300 ease-out ${drawn ? 'bg-mark' : 'bg-teal-500 dark:bg-teal-400'}`}
                    style={{ width: `${Math.max(c.probability * 100, 1)}%` }}
                  />
                </span>
                <span className="text-right font-mono text-xs text-graphite-700 dark:text-graphite-300">{percent(c.probability)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block size-2.5 rounded-full bg-mark" aria-hidden="true" /> the word that was drawn
        </p>

        <div className="mt-6">
          <Slider
            label="Temperature"
            value={temperature}
            min={0}
            max={2}
            step={0.1}
            onChange={setTemperature}
            format={(v) => v.toFixed(1)}
            hint={temperature === 0 ? 'Greedy: always the most likely word.' : 'Higher flattens the distribution.'}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setSeed((s) => s + 1)}>Draw again</Button>
          <Button
            variant="secondary"
            disabled={isDefault}
            onClick={() => {
              setTemperature(LEDE_DEFAULTS.temperature);
              setSeed(LEDE_DEFAULTS.seed);
            }}
          >
            Reset
          </Button>
        </div>

        <p className="mt-5 border-t border-graphite-200 pt-4 text-xs text-muted dark:border-graphite-800">
          The probabilities are scripted for this page.{' '}
          <a href={decodingLessonHref} className="text-teal-700 underline underline-offset-2 hover:text-teal-600 dark:text-teal-300">
            Inference &amp; decoding
          </a>{' '}
          shows how real models choose tokens.
        </p>
      </aside>
    </div>
  );
}
