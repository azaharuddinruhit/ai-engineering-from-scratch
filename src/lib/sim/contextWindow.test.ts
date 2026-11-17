import { describe, expect, it } from 'vitest';
import { contextBudget, positionOf, recallAtPosition } from './contextWindow';

const base = {
  windowTokens: 8_000,
  systemTokens: 500,
  fewShotTokens: 1_000,
  docTokens: 1_000,
  docCount: 10,
  questionTokens: 100,
  outputReserveTokens: 1_000,
};

describe('contextBudget', () => {
  it('drops documents that do not fit after fixed sections are reserved', () => {
    // 8000 − (500 + 1000 + 100 + 1000) = 5400 → 5 docs of 1000 tokens.
    const budget = contextBudget(base);
    expect(budget.docsThatFit).toBe(5);
    expect(budget.droppedDocs).toBe(5);
    expect(budget.usedTokens).toBe(7_600);
  });

  it('fits every document when the window is large enough', () => {
    expect(contextBudget({ ...base, windowTokens: 200_000 }).droppedDocs).toBe(0);
  });

  it('fits nothing when fixed sections alone exceed the window', () => {
    expect(contextBudget({ ...base, windowTokens: 2_000 }).docsThatFit).toBe(0);
  });
});

describe('recallAtPosition', () => {
  it('is U-shaped: the middle is worse than both edges', () => {
    const n = 20;
    const middle = recallAtPosition(10, n);
    expect(recallAtPosition(0, n)).toBeGreaterThan(middle);
    expect(recallAtPosition(n - 1, n)).toBeGreaterThan(middle);
  });

  it('degrades further as more documents are packed in', () => {
    expect(recallAtPosition(15, 30)).toBeLessThan(recallAtPosition(5, 10));
  });
});

describe('positionOf', () => {
  it('alternates best-ranked documents between the start and the end', () => {
    expect([0, 1, 2, 3, 4].map((rank) => positionOf(rank, 5, 'edgesFirst'))).toEqual([0, 4, 1, 3, 2]);
  });

  it('keeps retrieval order by default', () => {
    expect(positionOf(3, 5, 'rank')).toBe(3);
  });
});
