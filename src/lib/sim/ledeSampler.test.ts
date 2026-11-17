import { describe, expect, it } from 'vitest';
import { divergence, LEDE, LEDE_DEFAULTS, sampleLede } from './ledeSampler';

const text = (seed: number, temperature: number) =>
  sampleLede(temperature, seed)
    .map((t) => t.candidates[t.chosen].token)
    .join('');

describe('sampleLede', () => {
  it('opens on the intended sentence with the default temperature and seed', () => {
    expect(text(LEDE_DEFAULTS.seed, LEDE_DEFAULTS.temperature)).toBe(
      'Treat LLMs as what they are: powerful, non-deterministic software components.',
    );
  });

  it('degrades visibly as the learner raises the temperature from the default seed', () => {
    const at = (temperature: number) => divergence(sampleLede(temperature, LEDE_DEFAULTS.seed));
    expect(at(1)).toBeGreaterThan(0);
    expect(at(2)).toBeGreaterThan(at(1));
  });

  it('is greedy at temperature 0 for any seed', () => {
    for (const seed of [1, 2, 3, 99]) expect(divergence(sampleLede(0, seed))).toBe(0);
  });

  it('is reproducible for a given seed', () => {
    expect(text(42, 1.5)).toBe(text(42, 1.5));
  });

  it('drifts from the most likely text as temperature rises', () => {
    const average = (temperature: number) => {
      let total = 0;
      for (let seed = 1; seed <= 200; seed++) total += divergence(sampleLede(temperature, seed));
      return total / 200;
    };
    expect(average(0.2)).toBeLessThan(0.2);
    expect(average(2)).toBeGreaterThan(LEDE.length / 3);
  });
});
