import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it.each([
    'Hello, world!',
    'The quick brown fox — jumps over 1234567 lazy dogs.\n\nNew paragraph.',
    'const getUserById = async (id) => db.users.find(id);',
    'こんにちは世界 🚀 café',
    '   leading and trailing   ',
  ])('round-trips losslessly: %j', (text) => {
    expect(tokenize(text).join('')).toBe(text);
  });

  it('attaches leading spaces to words and keeps common words whole', () => {
    expect(tokenize('Hello world')).toEqual(['Hello', ' world']);
  });

  it('groups digits in threes', () => {
    expect(tokenize('1234567')).toEqual(['123', '456', '7']);
  });

  it('splits long words at a known suffix', () => {
    expect(tokenize(' tokenization')).toEqual([' token', 'ization']);
  });

  it('splits camelCase identifiers at case boundaries', () => {
    expect(tokenize('getUserById')).toEqual(['get', 'User', 'By', 'Id']);
  });

  it('charges non-Latin scripts roughly one token per character', () => {
    expect(tokenize('世界')).toHaveLength(2);
  });

  it('returns nothing for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});
