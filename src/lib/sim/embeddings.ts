import { stem, STOPWORDS, words } from './text';

/**
 * A tiny, interpretable "concept embedding" model.
 *
 * Real embedding models learn hundreds or thousands of opaque dimensions from data. Here every dimension
 * is a named concept and every known word contributes a fixed vector, so you can see *why* two texts are
 * close. A text's raw vector is the sum of its word vectors: longer texts get larger magnitudes, which is
 * exactly what makes the dot-product vs. cosine distinction visible.
 */

export const DIMENSIONS = [
  'billing',
  'retention',
  'security',
  'errors',
  'limits',
  'data',
  'software',
  'animals',
  'food',
  'travel',
  'positive',
  'negative',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type Vector = number[];

const GROUPS: Record<Dimension, string> = {
  billing:
    'refund refunds refunded charge charged charges invoice invoices price prices pricing payment payments pay paid ' +
    'plan plans cost costs money credit credits subscription subscriptions billing billed annual yearly monthly fee ' +
    'fees discount cheap expensive dollars cancel cancellation renewal prorated',
  retention:
    'retention retain retained keep kept keeping store stored delete deleted deletion purge purged expire expires ' +
    'expired history archive archived days months years long period',
  security:
    'sso saml login password passwords auth authentication security secure token tokens permission permissions ' +
    'access mfa encryption encrypted identity okta role roles admin',
  errors:
    'error errors fail failed failure outage retry retries timeout bug crash broken incident status code codes',
  limits:
    'rate limit limits limited throttle throttled throttling quota quotas requests burst minute second fast slow ' +
    'latency speed concurrency',
  data: 'data logs log file files backup backups database storage export exports record records region regions',
  software:
    'api apis code python javascript typescript function sdk endpoint endpoints deploy server software program ' +
    'programming developer webhook webhooks json',
  animals: 'cat cats dog dogs pet pets puppy kitten animal animals bird birds fish vet snake snakes',
  food: 'pizza recipe recipes cook cooking bake baking bread pasta coffee dinner eat eating kitchen meal tomato cheese',
  travel: 'river mountain mountains trip trips flight flights hotel beach travel lake hiking vacation city',
  positive: 'great love happy excellent good wonderful delighted fantastic easy',
  negative: 'angry terrible bad hate frustrated awful annoyed disappointed worst',
};

/** Ambiguous words load on several concepts: the embedding of "python" sits between code and animals. */
const MIXED: Record<string, Partial<Record<Dimension, number>>> = {
  python: { software: 0.8, animals: 0.6 },
  bank: { billing: 0.7, travel: 0.6 },
  java: { software: 0.7, food: 0.5 },
  crash: { errors: 0.8, travel: 0.3 },
  logs: { data: 0.8, retention: 0.4 },
  cookie: { food: 0.7, software: 0.4, security: 0.3 },
};

const VOCAB = new Map<string, Vector>();
DIMENSIONS.forEach((dimension, d) => {
  for (const word of GROUPS[dimension].split(' ')) {
    const vector = VOCAB.get(word) ?? DIMENSIONS.map(() => 0);
    vector[d] = 1;
    VOCAB.set(word, vector);
  }
});
for (const [word, weights] of Object.entries(MIXED)) {
  VOCAB.set(
    word,
    DIMENSIONS.map((d) => weights[d] ?? 0),
  );
}

export interface Embedding {
  vector: Vector;
  /** Words the model recognised. */
  known: string[];
  /** Words outside the vocabulary: they contribute nothing, like rare identifiers in real models. */
  unknown: string[];
}

export function embed(text: string): Embedding {
  const vector = DIMENSIONS.map(() => 0);
  const known: string[] = [];
  const unknown: string[] = [];
  for (const { text: word } of words(text)) {
    if (STOPWORDS.has(word)) continue;
    const wordVector = VOCAB.get(word) ?? VOCAB.get(stem(word));
    if (!wordVector) {
      unknown.push(word);
      continue;
    }
    known.push(word);
    wordVector.forEach((v, i) => (vector[i] += v));
  }
  return { vector, known, unknown };
}

export const dot = (a: Vector, b: Vector) => a.reduce((sum, v, i) => sum + v * b[i], 0);

export const norm = (v: Vector) => Math.sqrt(dot(v, v));

export function normalize(v: Vector): Vector {
  const n = norm(v);
  return n === 0 ? v.map(() => 0) : v.map((x) => x / n);
}

/** Cosine similarity; 0 when either vector is empty (nothing recognised). */
export function cosine(a: Vector, b: Vector): number {
  const denominator = norm(a) * norm(b);
  return denominator === 0 ? 0 : dot(a, b) / denominator;
}

/** Projects vectors onto their first two principal components (power iteration with deflation). */
export function project2d(vectors: Vector[]): [number, number][] {
  const n = vectors.length;
  const d = vectors[0]?.length ?? 0;
  if (n === 0) return [];
  const mean = Array.from({ length: d }, (_, j) => vectors.reduce((s, v) => s + v[j], 0) / n);
  const centered = vectors.map((v) => v.map((x, j) => x - mean[j]));
  const covariance = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => centered.reduce((s, v) => s + v[i] * v[j], 0) / n),
  );

  const components: Vector[] = [];
  for (let c = 0; c < 2; c++) {
    let v = normalize(Array.from({ length: d }, (_, i) => 1 + ((i * 7 + c * 3) % 5)));
    for (let iter = 0; iter < 200; iter++) {
      let next = covariance.map((row) => dot(row, v));
      for (const prev of components) {
        const p = dot(next, prev);
        next = next.map((x, i) => x - p * prev[i]);
      }
      const nextNorm = norm(next);
      if (nextNorm < 1e-12) break;
      v = next.map((x) => x / nextNorm);
    }
    components.push(v);
  }
  return centered.map((v) => [dot(v, components[0]), dot(v, components[1])]);
}
