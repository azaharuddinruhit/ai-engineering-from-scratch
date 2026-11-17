import { describe, expect, it } from 'vitest';
import { HANDBOOK } from './corpus';
import { bm25Search, denseSearch, reciprocalRankFusion, rerank, retrieve } from './retrieval';

// One document per paragraph keeps expectations readable.
const docs = HANDBOOK.split(/\n\n+/).filter((p) => !p.startsWith('#'));
const indexOf = (needle: string) => docs.findIndex((d) => d.includes(needle));

const ERROR_DOC = indexOf('ERR-4012');
const RETENTION_DOC = indexOf('Request logs are kept');

describe('bm25Search', () => {
  it('finds exact identifiers that embeddings cannot represent', () => {
    expect(bm25Search(docs, 'ERR-4012')[0].index).toBe(ERROR_DOC);
    expect(denseSearch(docs, 'ERR-4012')).toEqual([]);
  });

  it('weights rare terms above common ones', () => {
    const [top] = bm25Search(docs, 'plans SAML');
    expect(docs[top.index]).toContain('SAML');
  });
});

describe('denseSearch', () => {
  it('matches meaning without shared words', () => {
    expect(denseSearch(docs, 'How long until my history is purged?')[0].index).toBe(RETENTION_DOC);
  });
});

describe('reciprocalRankFusion', () => {
  it('sums 1/(k + rank) across rankings', () => {
    const fused = reciprocalRankFusion(
      [
        [{ index: 0, score: 9 }, { index: 1, score: 5 }],
        [{ index: 1, score: 0.9 }],
      ],
      60,
    );
    expect(fused[0]).toEqual({ index: 1, score: 1 / 62 + 1 / 61 });
    expect(fused[1]).toEqual({ index: 0, score: 1 / 61 });
  });
});

describe('rerank', () => {
  it('only reorders the candidates it is given', () => {
    const candidates = bm25Search(docs, 'refund annual').slice(0, 3);
    const reranked = rerank(docs, 'refund annual', candidates);
    expect(reranked.map((h) => h.index).sort()).toEqual(candidates.map((h) => h.index).sort());
  });
});

describe('retrieve', () => {
  it('hybrid retrieval succeeds on both lexical and semantic queries', () => {
    expect(retrieve(docs, 'ERR-4012', 'hybrid', 3).map((h) => h.index)).toContain(ERROR_DOC);
    expect(retrieve(docs, 'How long until my history is purged?', 'hybrid', 3).map((h) => h.index)).toContain(
      RETENTION_DOC,
    );
  });

  it('reranking puts the error reference first for an error query', () => {
    expect(retrieve(docs, 'what does ERR-4012 mean', 'hybridRerank', 3)[0].index).toBe(ERROR_DOC);
  });
});
