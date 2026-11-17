/** Shared lexical helpers for the retrieval simulations: word spans, stopwords and light stemming. */

export interface Word {
  /** Lowercased word text. */
  text: string;
  start: number;
  end: number;
}

// Words, numbers and identifiers such as "ERR-4012" or "max_tokens" stay single terms.
const WORD = /[\p{L}\p{N}]+(?:[-_'.][\p{L}\p{N}]+)*/gu;

export function words(text: string): Word[] {
  return Array.from(text.matchAll(WORD), (m) => ({
    text: m[0].toLowerCase(),
    start: m.index,
    end: m.index + m[0].length,
  }));
}

export const STOPWORDS = new Set(
  (
    'a an and are as at be been but by can could do does did for from had has have how i if in into is it its ' +
    'me my no not of on or our so than that the their them then there these they this to was we were what when ' +
    'where which who why will with would you your yours i\'m it\'s do don\'t get got any all also about more most ' +
    'per each just only very after before over under up out'
  ).split(' '),
);

/** Conservative suffix stripping so "refunds"/"refunded"/"refund" match. Identifiers and numbers are untouched. */
export function stem(word: string): string {
  if (/\d/.test(word) || word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && /(?:ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Stemmed, stopword-free terms: the vocabulary of lexical search and grounding checks. */
export function contentTerms(text: string): string[] {
  return words(text)
    .map((w) => w.text)
    .filter((w) => !STOPWORDS.has(w))
    .map(stem);
}

/** Sentence spans, splitting on terminal punctuation and blank lines. */
export function sentences(text: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  const boundary = /[.!?](?=\s)|\n\s*\n/g;
  let start = 0;
  for (const m of text.matchAll(boundary)) {
    const end = m.index + (m[0].startsWith('\n') ? 0 : 1);
    if (text.slice(start, end).trim()) spans.push({ start, end });
    start = m.index + m[0].length;
  }
  if (text.slice(start).trim()) spans.push({ start, end: text.length });
  return spans.map(({ start: s, end }) => {
    const leading = text.slice(s, end).length - text.slice(s, end).trimStart().length;
    return { start: s + leading, end };
  });
}
