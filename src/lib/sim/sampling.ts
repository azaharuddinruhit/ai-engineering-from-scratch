import type { Rng } from './rng';

export interface Candidate {
  token: string;
  logit: number;
}

export interface SamplingParams {
  /** 0 means greedy decoding. */
  temperature: number;
  /** 0 disables top-k. */
  topK: number;
  /** 1 disables top-p (nucleus) filtering. */
  topP: number;
}

export interface ScoredCandidate extends Candidate {
  /** Probability at temperature 1 with no filtering: the model's raw belief. */
  baseProbability: number;
  /** Final probability after temperature, top-k and top-p, renormalised. */
  probability: number;
  kept: boolean;
}

export function softmax(values: readonly number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/**
 * Applies the standard decoding pipeline used by inference servers:
 * temperature scaling → top-k truncation → top-p truncation → renormalise.
 * Candidates are returned sorted by logit, highest first.
 */
export function applySampling(
  candidates: readonly Candidate[],
  { temperature, topK, topP }: SamplingParams,
): ScoredCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.logit - a.logit);
  const base = softmax(sorted.map((c) => c.logit));
  const scaled =
    temperature <= 0
      ? sorted.map((_, i) => (i === 0 ? 1 : 0))
      : softmax(sorted.map((c) => c.logit / temperature));

  const kLimit = topK > 0 ? Math.min(topK, sorted.length) : sorted.length;
  const kMass = sum(scaled.slice(0, kLimit));

  // Nucleus: keep the smallest prefix whose (renormalised) mass reaches top-p. Always keep one.
  const kept = sorted.map(() => false);
  let cumulative = 0;
  for (let i = 0; i < kLimit; i++) {
    kept[i] = true;
    cumulative += scaled[i] / kMass;
    if (cumulative >= topP - 1e-9) break;
  }

  const keptMass = sum(scaled.filter((_, i) => kept[i]));
  return sorted.map((c, i) => ({
    ...c,
    baseProbability: base[i],
    probability: kept[i] ? scaled[i] / keptMass : 0,
    kept: kept[i],
  }));
}

/** Draws one candidate index from the final distribution. */
export function sampleIndex(scored: readonly ScoredCandidate[], rng: Rng): number {
  const r = rng();
  let cumulative = 0;
  let lastKept = 0;
  for (let i = 0; i < scored.length; i++) {
    if (!scored[i].kept) continue;
    lastKept = i;
    cumulative += scored[i].probability;
    if (r < cumulative) return i;
  }
  return lastKept;
}

/** Shannon entropy in bits: 0 = fully deterministic, higher = more randomness. */
export function entropyBits(probabilities: readonly number[]): number {
  return probabilities.reduce((acc, p) => (p > 0 ? acc - p * Math.log2(p) : acc), 0);
}
