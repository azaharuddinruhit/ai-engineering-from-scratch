import { cosine, embed } from './embeddings';
import { sentences } from './text';
import { tokenize } from './tokenizer';

/** A chunk is always a slice of the source, so overlaps and boundaries can be highlighted exactly. */
export interface Chunk {
  start: number;
  end: number;
  text: string;
  tokens: number;
}

export type ChunkStrategy = 'fixed' | 'recursive' | 'semantic';

export const CHUNK_STRATEGIES: readonly { value: ChunkStrategy; label: string }[] = [
  { value: 'fixed', label: 'Fixed-size' },
  { value: 'recursive', label: 'Recursive' },
  { value: 'semantic', label: 'Semantic' },
];

export interface ChunkOptions {
  /** Maximum chunk size in tokens. */
  size: number;
  /** Tokens repeated from the end of one chunk at the start of the next (fixed and recursive only). */
  overlap: number;
  /** Semantic only: start a new chunk when adjacent sentences are less similar than this. */
  similarityThreshold: number;
}

interface Span {
  start: number;
  end: number;
}

const countTokens = (text: string) => tokenize(text).length;

function toChunk(source: string, { start, end }: Span): Chunk {
  const text = source.slice(start, end);
  return { start, end, text, tokens: countTokens(text) };
}

/** Fixed windows of `size` tokens, each starting `size - overlap` tokens after the previous one. */
export function chunkFixed(source: string, { size, overlap }: ChunkOptions): Chunk[] {
  const tokens = tokenize(source);
  const offsets = [0];
  for (const token of tokens) offsets.push(offsets[offsets.length - 1] + token.length);

  const step = Math.max(1, size - overlap);
  const chunks: Chunk[] = [];
  for (let i = 0; i < tokens.length; i += step) {
    const last = Math.min(i + size, tokens.length);
    chunks.push(toChunk(source, { start: offsets[i], end: offsets[last] }));
    if (last === tokens.length) break;
  }
  return chunks;
}

const SEPARATORS = ['\n\n', '\n', '. ', ' '];

/** Splits a span on the coarsest separator that works, recursing into pieces that are still too large. */
function splitRecursively(source: string, span: Span, size: number, level: number): Span[] {
  if (countTokens(source.slice(span.start, span.end)) <= size) return [span];
  if (level >= SEPARATORS.length) {
    const fixed = chunkFixed(source.slice(span.start, span.end), { size, overlap: 0, similarityThreshold: 0 });
    return fixed.map((c) => ({ start: span.start + c.start, end: span.start + c.end }));
  }

  const separator = SEPARATORS[level];
  const pieces: Span[] = [];
  let start = span.start;
  let index = source.indexOf(separator, start);
  while (index !== -1 && index < span.end) {
    pieces.push({ start, end: index + separator.length }); // keep the separator with the preceding piece
    start = index + separator.length;
    index = source.indexOf(separator, start);
  }
  if (start < span.end) pieces.push({ start, end: span.end });
  if (pieces.length === 1) return splitRecursively(source, span, size, level + 1);
  return pieces.flatMap((piece) => splitRecursively(source, piece, size, level + 1));
}

/** Greedily merges small pieces back up to `size`, carrying trailing pieces forward as overlap. */
function mergePieces(source: string, pieces: Span[], size: number, overlap: number): Chunk[] {
  const count = (from: number, to: number) => countTokens(source.slice(pieces[from].start, pieces[to].end));
  const chunks: Chunk[] = [];
  let i = 0;
  while (i < pieces.length) {
    let j = i + 1; // exclusive end; a single piece always fits after splitting
    while (j < pieces.length && count(i, j) <= size) j++;
    chunks.push(toChunk(source, { start: pieces[i].start, end: pieces[j - 1].end }));
    if (j >= pieces.length) break;
    let next = j;
    while (next - 1 > i && count(next - 1, j - 1) <= overlap) next--;
    i = next;
  }
  return chunks;
}

/** Respects document structure: paragraphs, then lines, then sentences, then words. */
export function chunkRecursive(source: string, { size, overlap }: ChunkOptions): Chunk[] {
  const pieces = splitRecursively(source, { start: 0, end: source.length }, size, 0);
  return mergePieces(source, pieces, size, overlap);
}

/** Starts a new chunk where the topic shifts: adjacent-sentence similarity drops below the threshold. */
export function chunkSemantic(source: string, { size, similarityThreshold }: ChunkOptions): Chunk[] {
  const spans = sentences(source);
  if (spans.length === 0) return [];
  const vectors = spans.map((s) => embed(source.slice(s.start, s.end)).vector);

  const chunks: Chunk[] = [];
  let first = 0;
  for (let i = 1; i <= spans.length; i++) {
    const atEnd = i === spans.length;
    const topicShift = !atEnd && cosine(vectors[i - 1], vectors[i]) < similarityThreshold;
    const tooBig = !atEnd && countTokens(source.slice(spans[first].start, spans[i].end)) > size;
    if (atEnd || topicShift || tooBig) {
      chunks.push(toChunk(source, { start: spans[first].start, end: spans[i - 1].end }));
      first = i;
    }
  }
  return chunks;
}

export const CHUNKERS: Record<ChunkStrategy, (source: string, options: ChunkOptions) => Chunk[]> = {
  fixed: chunkFixed,
  recursive: chunkRecursive,
  semantic: chunkSemantic,
};

export interface ChunkStats {
  count: number;
  averageTokens: number;
  minTokens: number;
  maxTokens: number;
  /** Extra tokens you embed and store because of overlap, relative to the source. */
  overlapOverhead: number;
  /** Chunks that end in the middle of a sentence. */
  brokenSentences: number;
}

export function chunkStats(source: string, chunks: Chunk[]): ChunkStats {
  if (chunks.length === 0) {
    return { count: 0, averageTokens: 0, minTokens: 0, maxTokens: 0, overlapOverhead: 0, brokenSentences: 0 };
  }
  const tokenCounts = chunks.map((c) => c.tokens);
  const total = tokenCounts.reduce((a, b) => a + b, 0);
  const sourceTokens = countTokens(source);
  return {
    count: chunks.length,
    averageTokens: total / chunks.length,
    minTokens: Math.min(...tokenCounts),
    maxTokens: Math.max(...tokenCounts),
    overlapOverhead: sourceTokens === 0 ? 0 : Math.max(0, total / sourceTokens - 1),
    brokenSentences: chunks.filter((c) => {
      const tail = c.text.trimEnd();
      const atDocumentEnd = source.slice(c.end).trim() === '';
      return !atDocumentEnd && !/[.!?:]$/.test(tail) && !/^#/m.test(tail.split('\n').pop() ?? '');
    }).length,
  };
}
