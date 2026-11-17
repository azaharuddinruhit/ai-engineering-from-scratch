import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { applySampling, entropyBits, sampleIndex, softmax } from './sampling';

const candidates = [
  { token: ' b', logit: 2 },
  { token: ' a', logit: 4 },
  { token: ' c', logit: 1 },
  { token: ' d', logit: 0 },
];

const totalProbability = (values: { probability: number }[]) => values.reduce((a, c) => a + c.probability, 0);

describe('softmax', () => {
  it('produces a normalised distribution that preserves ordering', () => {
    const probs = softmax([1, 3, 2]);
    expect(probs.reduce((a, b) => a + b)).toBeCloseTo(1);
    expect(probs[1]).toBeGreaterThan(probs[2]);
    expect(probs[2]).toBeGreaterThan(probs[0]);
  });
});

describe('applySampling', () => {
  it('sorts by logit and leaves the distribution untouched at T=1 with filters off', () => {
    const scored = applySampling(candidates, { temperature: 1, topK: 0, topP: 1 });
    expect(scored.map((c) => c.token)).toEqual([' a', ' b', ' c', ' d']);
    scored.forEach((c) => expect(c.probability).toBeCloseTo(c.baseProbability));
  });

  it('is greedy at temperature 0', () => {
    const scored = applySampling(candidates, { temperature: 0, topK: 0, topP: 1 });
    expect(scored[0]).toMatchObject({ token: ' a', probability: 1, kept: true });
    expect(scored.slice(1).every((c) => !c.kept && c.probability === 0)).toBe(true);
  });

  it('flattens the distribution as temperature rises', () => {
    const cold = applySampling(candidates, { temperature: 0.5, topK: 0, topP: 1 });
    const hot = applySampling(candidates, { temperature: 2, topK: 0, topP: 1 });
    expect(entropyBits(hot.map((c) => c.probability))).toBeGreaterThan(entropyBits(cold.map((c) => c.probability)));
  });

  it('keeps only the k most likely tokens and renormalises', () => {
    const scored = applySampling(candidates, { temperature: 1, topK: 2, topP: 1 });
    expect(scored.filter((c) => c.kept).map((c) => c.token)).toEqual([' a', ' b']);
    expect(totalProbability(scored)).toBeCloseTo(1);
  });

  it('keeps the smallest nucleus whose mass reaches top-p', () => {
    // At T=1 the top token holds ~84% of the mass, so p=0.8 keeps only it and p=0.9 adds the second.
    expect(applySampling(candidates, { temperature: 1, topK: 0, topP: 0.8 }).filter((c) => c.kept)).toHaveLength(1);
    expect(applySampling(candidates, { temperature: 1, topK: 0, topP: 0.9 }).filter((c) => c.kept)).toHaveLength(2);
  });
});

describe('sampleIndex', () => {
  it('is reproducible for a seed and never picks a filtered token', () => {
    const scored = applySampling(candidates, { temperature: 1.5, topK: 3, topP: 1 });
    const draw = (seed: number) => {
      const rng = createRng(seed);
      return Array.from({ length: 200 }, () => sampleIndex(scored, rng));
    };
    expect(draw(7)).toEqual(draw(7));
    expect(draw(7).every((i) => scored[i].kept)).toBe(true);
  });
});

describe('entropyBits', () => {
  it('is zero for a certain outcome and log2(n) for a uniform one', () => {
    expect(entropyBits([1, 0, 0])).toBe(0);
    expect(entropyBits([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2);
  });
});
