import { describe, expect, it } from 'vitest';
import { cosine, dot, embed, norm, normalize, project2d } from './embeddings';
import { EMBEDDING_CORPUS } from './corpus';

const vectorOf = (id: string) => embed(EMBEDDING_CORPUS.find((s) => s.id === id)!.text).vector;

describe('embed', () => {
  it('places same-topic texts closer than different-topic texts', () => {
    expect(cosine(vectorOf('p1'), vectorOf('p2'))).toBeGreaterThan(cosine(vectorOf('p1'), vectorOf('c1')));
    expect(cosine(vectorOf('f1'), vectorOf('f2'))).toBeGreaterThan(cosine(vectorOf('f1'), vectorOf('m1')));
  });

  it('puts ambiguous words between their senses', () => {
    const python = embed('python').vector;
    expect(cosine(python, embed('code').vector)).toBeGreaterThan(0.5);
    expect(cosine(python, embed('snake').vector)).toBeGreaterThan(0.5);
  });

  it('reports unknown words, ignoring stopwords', () => {
    expect(embed('The ERR-4012 refund').unknown).toEqual(['err-4012']);
  });

  it('returns an all-zero vector when nothing is recognised', () => {
    expect(norm(embed('ERR-4012').vector)).toBe(0);
    expect(cosine(embed('ERR-4012').vector, vectorOf('m1'))).toBe(0);
  });
});

describe('dot product vs. cosine', () => {
  it('rewards long documents under dot product but not under cosine', () => {
    const query = embed('refund price').vector;
    const short = vectorOf('m2');
    const long = vectorOf('a2');
    expect(dot(query, long)).toBeGreaterThan(dot(query, short));
    expect(dot(normalize(query), normalize(long))).toBeCloseTo(cosine(query, long));
  });
});

describe('project2d', () => {
  it('returns one point per vector, centred on the origin', () => {
    const points = project2d(EMBEDDING_CORPUS.map((s) => embed(s.text).vector));
    expect(points).toHaveLength(EMBEDDING_CORPUS.length);
    const meanX = points.reduce((s, p) => s + p[0], 0) / points.length;
    expect(meanX).toBeCloseTo(0);
  });
});
