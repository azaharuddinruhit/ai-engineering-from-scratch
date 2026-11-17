/**
 * An illustrative BPE-style tokenizer.
 *
 * Real tokenizers (tiktoken, SentencePiece, provider tokenizers) learn tens of thousands of merges
 * from data, so exact counts differ per model. This approximation reproduces the *behaviour* that
 * matters for engineering: leading spaces attach to words, common words are one token, rare/long
 * words and identifiers split into pieces, digits group in threes, and non-Latin scripts cost more.
 * Joining the returned tokens always reproduces the input exactly.
 */

// GPT-style pre-tokenisation: contractions, words, digit groups, punctuation runs, whitespace.
const PRE_TOKEN =
  /'(?:s|t|re|ve|m|ll|d)\b| ?[\p{L}\p{M}]+| ?\p{N}{1,3}| ?[^\s\p{L}\p{M}\p{N}]+|\s+(?!\S)|\s+/gu;

const LATIN_WORD = /^\p{Script=Latin}+$/u;
const MAX_SINGLE_TOKEN_WORD = 8;
const SUBWORD_PIECE = 6;
const PUNCT_PIECE = 3;
const SUFFIXES = ['ization', 'ation', 'ments', 'ment', 'ness', 'tion', 'sion', 'able', 'ible', 'ing', 'ers', 'ed', 'ly'];

const chunk = (text: string, size: number): string[] => {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += size) pieces.push(text.slice(i, i + size));
  return pieces;
};

function splitLatinWord(word: string): string[] {
  if (word.length <= MAX_SINGLE_TOKEN_WORD) return [word];
  const lower = word.toLowerCase();
  const suffix = SUFFIXES.find((s) => lower.endsWith(s) && word.length - s.length >= 3);
  const stem = suffix ? word.slice(0, -suffix.length) : word;
  const stemPieces = stem.length <= MAX_SINGLE_TOKEN_WORD ? [stem] : chunk(stem, SUBWORD_PIECE);
  return suffix ? [...stemPieces, word.slice(-suffix.length)] : stemPieces;
}

function splitWord(word: string): string[] {
  if (!LATIN_WORD.test(word)) {
    // Non-Latin scripts get far fewer merges in English-heavy vocabularies: roughly one token per character.
    return Array.from(word);
  }
  // camelCase / PascalCase identifiers split at case boundaries before length rules apply.
  return word.split(/(?<=[a-z])(?=[A-Z])/).flatMap(splitLatinWord);
}

function splitPiece(piece: string): string[] {
  if (/^\s+$/.test(piece) || /^ ?\p{N}+$/u.test(piece)) return [piece];

  const lead = piece.startsWith(' ') ? ' ' : '';
  const body = lead ? piece.slice(1) : piece;
  const parts = /^[\p{L}\p{M}]+$/u.test(body)
    ? splitWord(body)
    : /^[\x21-\x7e]+$/.test(body)
      ? chunk(body, PUNCT_PIECE)
      : Array.from(body); // emoji and other symbols: about one token per code point

  parts[0] = lead + parts[0];
  return parts;
}

export function tokenize(text: string): string[] {
  return (text.match(PRE_TOKEN) ?? []).flatMap(splitPiece);
}
