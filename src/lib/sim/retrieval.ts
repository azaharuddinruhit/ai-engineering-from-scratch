import { cosine, embed } from './embeddings';
import { contentTerms } from './text';

export interface Hit {
  /** Index into the searched document list. */
  index: number;
  score: number;
}

const byScore = (a: Hit, b: Hit) => b.score - a.score || a.index - b.index;

export interface Bm25Params {
  /** Term-frequency saturation: higher means repeated terms keep adding score for longer. */
  k1: number;
  /** Length normalisation: 0 ignores document length, 1 fully normalises by it. */
  b: number;
}

/** Okapi BM25 over stemmed content terms. Documents with no matching term are omitted. */
export function bm25Search(docs: readonly string[], query: string, { k1, b }: Bm25Params = { k1: 1.2, b: 0.75 }): Hit[] {
  const docTerms = docs.map(contentTerms);
  const averageLength = docTerms.reduce((sum, t) => sum + t.length, 0) / Math.max(1, docs.length);
  const queryTerms = [...new Set(contentTerms(query))];

  const documentFrequency = new Map(
    queryTerms.map((term) => [term, docTerms.filter((terms) => terms.includes(term)).length]),
  );

  return docTerms
    .map((terms, index) => {
      let score = 0;
      for (const term of queryTerms) {
        const tf = terms.filter((t) => t === term).length;
        if (tf === 0) continue;
        const n = documentFrequency.get(term)!;
        const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * terms.length) / averageLength));
      }
      return { index, score };
    })
    .filter((hit) => hit.score > 0)
    .sort(byScore);
}

/** Cosine similarity between query and document embeddings. Unrelated documents (≤ 0) are omitted. */
export function denseSearch(docs: readonly string[], query: string): Hit[] {
  const q = embed(query).vector;
  return docs
    .map((doc, index) => ({ index, score: cosine(q, embed(doc).vector) }))
    .filter((hit) => hit.score > 0)
    .sort(byScore);
}

/**
 * Reciprocal Rank Fusion (Cormack et al., 2009): score = Σ 1 / (k + rank).
 * Uses ranks only, so scores on incompatible scales (BM25 vs. cosine) never need calibrating.
 */
export function reciprocalRankFusion(rankings: readonly Hit[][], k = 60): Hit[] {
  const fused = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((hit, position) => {
      fused.set(hit.index, (fused.get(hit.index) ?? 0) + 1 / (k + position + 1));
    });
  }
  return Array.from(fused, ([index, score]) => ({ index, score })).sort(byScore);
}

/**
 * Simulated cross-encoder: scores each (query, document) pair jointly, combining exact query-term
 * coverage with semantic similarity. Real cross-encoders are transformer models that read both texts
 * together; like them, this is too slow to run over a whole corpus, so it only reorders candidates.
 */
export function rerank(docs: readonly string[], query: string, candidates: readonly Hit[]): Hit[] {
  const queryTerms = [...new Set(contentTerms(query))];
  const q = embed(query).vector;
  return candidates
    .map(({ index }) => {
      const terms = new Set(contentTerms(docs[index]));
      const coverage = queryTerms.length === 0 ? 0 : queryTerms.filter((t) => terms.has(t)).length / queryTerms.length;
      return { index, score: 0.6 * coverage + 0.4 * Math.max(0, cosine(q, embed(docs[index]).vector)) };
    })
    .sort(byScore);
}

export type RetrievalMode = 'dense' | 'lexical' | 'hybrid' | 'hybridRerank';

/** Runs one retrieval mode end to end and returns the top-k hits. */
export function retrieve(docs: readonly string[], query: string, mode: RetrievalMode, topK: number, candidatePool = 20): Hit[] {
  switch (mode) {
    case 'dense':
      return denseSearch(docs, query).slice(0, topK);
    case 'lexical':
      return bm25Search(docs, query).slice(0, topK);
    case 'hybrid':
      return reciprocalRankFusion([denseSearch(docs, query), bm25Search(docs, query)]).slice(0, topK);
    case 'hybridRerank': {
      const pool = reciprocalRankFusion([denseSearch(docs, query), bm25Search(docs, query)]).slice(0, candidatePool);
      return rerank(docs, query, pool).slice(0, topK);
    }
  }
}
