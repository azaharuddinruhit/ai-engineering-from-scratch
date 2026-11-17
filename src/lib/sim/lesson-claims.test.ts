import { expect, it } from 'vitest';
import { CHUNKERS, chunkStats } from './chunking';
import { GROUNDING_ANSWERS, GROUNDING_SOURCES, HANDBOOK } from './corpus';
import { checkAnswer } from './grounding';
import { retrieve, type RetrievalMode } from './retrieval';

const chunksAt = (size: number) =>
  CHUNKERS.recursive(HANDBOOK, { size, overlap: 0, similarityThreshold: 0.3 }).map((c) => c.text);
const found = (texts: string[], q: string, a: string, mode: RetrievalMode) =>
  retrieve(texts, q, mode, 3).some((h) => texts[h.index].includes(a));

it('lesson 3 lab claims hold at default settings', () => {
  const texts = chunksAt(60);
  const err = ['what does ERR-4012 mean', 'ERR-4012 means'] as const;
  const para = ['How long until my history is purged?', 'Request logs are kept'] as const;
  expect(found(texts, ...err, 'dense')).toBe(false);
  expect(found(texts, ...err, 'lexical')).toBe(true);
  expect(found(texts, ...para, 'lexical')).toBe(false);
  expect(found(texts, ...para, 'dense')).toBe(true);
  for (const [q, a] of [err, para]) {
    expect(found(texts, q, a, 'hybrid')).toBe(true);
    expect(texts[retrieve(texts, q, 'hybridRerank', 3)[0].index]).toContain(a);
  }
  const small = chunksAt(32);
  for (const mode of ['dense', 'lexical', 'hybrid', 'hybridRerank'] as const) {
    expect(found(small, 'money back on a yearly subscription', 'Annual plans can be refunded', mode)).toBe(false);
  }
});

it('lesson 2 lab claims hold at default settings', () => {
  const opts = { size: 60, overlap: 10, similarityThreshold: 0.3 };
  expect(chunkStats(HANDBOOK, CHUNKERS.fixed(HANDBOOK, opts)).brokenSentences).toBeGreaterThan(0);
  expect(chunkStats(HANDBOOK, CHUNKERS.recursive(HANDBOOK, opts)).brokenSentences).toBe(0);
  expect(chunkStats(HANDBOOK, CHUNKERS.semantic(HANDBOOK, opts)).minTokens).toBeLessThan(10);
});

it('lesson 4 lab claims hold', () => {
  const faithful = GROUNDING_ANSWERS.find((a) => a.id === 'faithful')!.text;
  expect(checkAnswer(faithful, GROUNDING_SOURCES, 0.9).faithfulness).toBeLessThan(1);
  const [, wrongFigure] = checkAnswer(GROUNDING_ANSWERS.find((a) => a.id === 'number')!.text, GROUNDING_SOURCES).sentences;
  expect(wrongFigure.support).toBeGreaterThanOrEqual(0.6);
});
