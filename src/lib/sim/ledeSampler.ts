import { createRng } from './rng';
import { applySampling, sampleIndex, type Candidate, type ScoredCandidate } from './sampling';

/**
 * A scripted next-token distribution for the home page's opening sentence.
 * The first candidate at each position is the intended text; the logits are illustrative, not from a real model,
 * and each position's distribution is fixed (it does not condition on earlier picks).
 */
export const LEDE: readonly (readonly Candidate[])[] = [
  [{ token: 'Treat', logit: 4 }, { token: 'Think of', logit: 2.4 }, { token: 'Use', logit: 1.8 }, { token: 'Ignore', logit: 0.3 }],
  [{ token: ' LLMs', logit: 4.2 }, { token: ' models', logit: 3 }, { token: ' prompts', logit: 1.2 }, { token: ' interns', logit: 0.1 }],
  [{ token: ' as', logit: 4.5 }, { token: ' like', logit: 3.3 }, { token: ' gently', logit: 0.2 }],
  [{ token: ' what', logit: 4 }, { token: ' exactly what', logit: 2.2 }, { token: ' if', logit: 1.2 }, { token: ' oracles', logit: 0.4 }],
  [{ token: ' they', logit: 5 }, { token: ' it', logit: 1 }, { token: ' magic', logit: 0.2 }],
  [{ token: ' are', logit: 5 }, { token: ' were', logit: 1.1 }, { token: ' claim', logit: 0.8 }],
  [{ token: ':', logit: 4 }, { token: ',', logit: 2 }, { token: ' —', logit: 1.7 }, { token: '!', logit: 0.2 }],
  [{ token: ' powerful', logit: 3.6 }, { token: ' capable', logit: 2.8 }, { token: ' expensive', logit: 2 }, { token: ' chatty', logit: 0.9 }, { token: ' haunted', logit: 0 }],
  [{ token: ',', logit: 4.5 }, { token: ' but', logit: 2 }, { token: ' and', logit: 1.6 }],
  [{ token: ' non-deterministic', logit: 3.8 }, { token: ' probabilistic', logit: 3.4 }, { token: ' unpredictable', logit: 2.6 }, { token: ' moody', logit: 0.5 }, { token: ' delicious', logit: -0.6 }],
  [{ token: ' software', logit: 4 }, { token: ' black-box', logit: 1.8 }, { token: ' statistical', logit: 1.6 }, { token: ' cloud', logit: 0.3 }],
  [{ token: ' components', logit: 4 }, { token: ' systems', logit: 2.6 }, { token: ' dependencies', logit: 1.6 }, { token: ' coworkers', logit: 0.4 }],
  [{ token: '.', logit: 5 }, { token: '!', logit: 1.2 }, { token: '…', logit: 0.8 }],
];

/** The opening state: a typical temperature, and a seed whose draw happens to be the intended sentence. */
export const LEDE_DEFAULTS = { temperature: 0.7, seed: 5 } as const;

export interface SampledToken {
  /** Candidates at this position, sorted by logit, with probabilities at the chosen temperature. */
  candidates: ScoredCandidate[];
  /** Index into `candidates` of the token that was drawn. */
  chosen: number;
}

/** Draws the whole sentence once, left to right, at one temperature. Same seed, same sentence. */
export function sampleLede(temperature: number, seed: number): SampledToken[] {
  const rng = createRng(seed);
  return LEDE.map((position) => {
    const candidates = applySampling(position, { temperature, topK: 0, topP: 1 });
    return { candidates, chosen: sampleIndex(candidates, rng) };
  });
}

/** Number of positions where the drawn token is not the most likely one. */
export const divergence = (tokens: readonly SampledToken[]) => tokens.filter((t) => t.chosen !== 0).length;
