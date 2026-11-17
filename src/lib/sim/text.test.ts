import { describe, expect, it } from 'vitest';
import { contentTerms, sentences, stem, words } from './text';

describe('words', () => {
  it('keeps identifiers and decimals as single lowercase terms with offsets', () => {
    expect(words('See ERR-4012 in SAML 2.0.')).toEqual([
      { text: 'see', start: 0, end: 3 },
      { text: 'err-4012', start: 4, end: 12 },
      { text: 'in', start: 13, end: 15 },
      { text: 'saml', start: 16, end: 20 },
      { text: '2.0', start: 21, end: 24 },
    ]);
  });
});

describe('stem', () => {
  it.each([
    ['refunds', 'refund'],
    ['refunded', 'refund'],
    ['refunding', 'refund'],
    ['policies', 'policy'],
    ['processes', 'process'],
    ['class', 'class'],
    ['err-4012', 'err-4012'],
  ])('%s → %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });
});

describe('contentTerms', () => {
  it('drops stopwords and stems the rest', () => {
    expect(contentTerms('How are the refunds issued?')).toEqual(['refund', 'issu']);
  });
});

describe('sentences', () => {
  it('splits on terminal punctuation and blank lines, trimming leading whitespace', () => {
    const text = '# Title\n\nFirst one. Second one!\nStill second? Third';
    expect(sentences(text).map((s) => text.slice(s.start, s.end))).toEqual([
      '# Title',
      'First one.',
      'Second one!',
      'Still second?',
      'Third',
    ]);
  });
});
