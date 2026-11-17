import { describe, expect, it } from 'vitest';
import { chunkFixed, chunkRecursive, chunkSemantic, chunkStats, type ChunkOptions } from './chunking';
import { HANDBOOK } from './corpus';

const options = (patch: Partial<ChunkOptions> = {}): ChunkOptions => ({
  size: 80,
  overlap: 0,
  similarityThreshold: 0.3,
  ...patch,
});

describe('chunkFixed', () => {
  it('covers the whole source without gaps when there is no overlap', () => {
    const chunks = chunkFixed(HANDBOOK, options());
    expect(chunks.map((c) => c.text).join('')).toBe(HANDBOOK);
    expect(chunks.every((c) => c.tokens <= 80)).toBe(true);
  });

  it('repeats tokens between neighbours when overlapping', () => {
    const chunks = chunkFixed(HANDBOOK, options({ overlap: 20 }));
    chunks.slice(1).forEach((chunk, i) => expect(chunk.start).toBeLessThan(chunks[i].end));
  });
});

describe('chunkRecursive', () => {
  it('respects the size limit and prefers paragraph boundaries', () => {
    const chunks = chunkRecursive(HANDBOOK, options());
    expect(chunks.every((c) => c.tokens <= 80)).toBe(true);
    expect(chunkStats(HANDBOOK, chunks).brokenSentences).toBeLessThan(
      chunkStats(HANDBOOK, chunkFixed(HANDBOOK, options())).brokenSentences,
    );
  });

  it('always makes progress with overlap close to the chunk size', () => {
    const chunks = chunkRecursive(HANDBOOK, options({ size: 40, overlap: 39 }));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1].end).toBe(HANDBOOK.length);
  });
});

describe('chunkSemantic', () => {
  it('splits at topic shifts so a chunk never mixes billing and error codes', () => {
    const chunks = chunkSemantic(HANDBOOK, options({ size: 400 }));
    expect(chunks.some((c) => c.text.includes('refund') && c.text.includes('ERR-4012'))).toBe(false);
  });
});

describe('chunkStats', () => {
  it('reports overlap overhead', () => {
    const plain = chunkStats(HANDBOOK, chunkFixed(HANDBOOK, options()));
    const overlapped = chunkStats(HANDBOOK, chunkFixed(HANDBOOK, options({ overlap: 40 })));
    expect(plain.overlapOverhead).toBeCloseTo(0, 1);
    expect(overlapped.overlapOverhead).toBeGreaterThan(0.5);
  });
});
