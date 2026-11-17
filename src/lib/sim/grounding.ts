import { contentTerms, sentences } from './text';

/**
 * A cheap, deterministic grounding check: does each answer sentence's cited source actually contain
 * its content words and, critically, its numbers? Production systems layer an NLI model or an
 * LLM judge on top, but checks like these catch the most damaging errors (wrong figures, wrong
 * citations) for free.
 */

export interface Source {
  id: number;
  text: string;
}

export type Verdict = 'supported' | 'misattributed' | 'number_mismatch' | 'unsupported' | 'uncited';

export interface SentenceCheck {
  text: string;
  citations: number[];
  verdict: Verdict;
  /** Share of the sentence's content terms found in its best cited source (0–1). */
  support: number;
  /** Uncited source that would support the sentence, if any. */
  betterSourceId: number | null;
  /** Numbers in the sentence that no cited source contains. */
  missingNumbers: string[];
  /** Content terms of the sentence absent from its best cited source. */
  missingTerms: string[];
}

export interface GroundingReport {
  sentences: SentenceCheck[];
  /** Share of sentences that are supported by their own citations. */
  faithfulness: number;
}

const CITATION = /\[(\d+)\]/g;
const NUMBER = /\d+(?:[.,]\d+)?%?/g;

/** Whole-number match: "14" must not be found inside "140" or "1.14". */
const containsNumber = (text: string, value: string) =>
  new RegExp(`(?<![\\d.,])${value.replace(/[.%]/g, '\\$&')}(?![\\d])`).test(text);

const missingFrom = (terms: string[], source: Source) => {
  const available = new Set(contentTerms(source.text));
  return terms.filter((t) => !available.has(t));
};

const supportOf = (terms: string[], source: Source) =>
  terms.length === 0 ? 1 : 1 - missingFrom(terms, source).length / terms.length;

export function checkSentence(sentence: string, sources: readonly Source[], threshold: number): SentenceCheck {
  const citations = [...new Set(Array.from(sentence.matchAll(CITATION), (m) => Number(m[1])))];
  const claim = sentence.replace(CITATION, '').trim();
  const terms = [...new Set(contentTerms(claim))];
  const numbers = claim.match(NUMBER) ?? [];

  const cited = sources.filter((s) => citations.includes(s.id));
  const bestCited = cited
    .map((s) => ({ source: s, support: supportOf(terms, s) }))
    .sort((a, b) => b.support - a.support)[0];
  const support = bestCited?.support ?? 0;
  const missingTerms = bestCited ? missingFrom(terms, bestCited.source) : terms;
  const missingNumbers = numbers.filter((n) => !cited.some((s) => containsNumber(s.text, n)));
  const better = sources
    .filter((s) => !citations.includes(s.id))
    .map((s) => ({ id: s.id, support: supportOf(terms, s) }))
    .sort((a, b) => b.support - a.support)[0];
  const betterSourceId = better && better.support >= threshold && better.support > support ? better.id : null;

  const verdict: Verdict =
    citations.length === 0
      ? 'uncited'
      : missingNumbers.length > 0
        ? 'number_mismatch'
        : support >= threshold
          ? 'supported'
          : betterSourceId !== null
            ? 'misattributed'
            : 'unsupported';

  return { text: sentence, citations, verdict, support, betterSourceId, missingNumbers, missingTerms };
}

export function checkAnswer(answer: string, sources: readonly Source[], threshold = 0.6): GroundingReport {
  const checks = sentences(answer).map(({ start, end }) => checkSentence(answer.slice(start, end), sources, threshold));
  const supported = checks.filter((c) => c.verdict === 'supported').length;
  return { sentences: checks, faithfulness: checks.length === 0 ? 0 : supported / checks.length };
}
