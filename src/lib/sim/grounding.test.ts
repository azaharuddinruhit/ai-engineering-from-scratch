import { describe, expect, it } from 'vitest';
import { GROUNDING_ANSWERS, GROUNDING_SOURCES } from './corpus';
import { checkAnswer } from './grounding';

const answer = (id: string) => GROUNDING_ANSWERS.find((a) => a.id === id)!.text;
const verdicts = (id: string) => checkAnswer(answer(id), GROUNDING_SOURCES).sentences.map((s) => s.verdict);

describe('checkAnswer', () => {
  it('marks a faithful answer fully supported', () => {
    const report = checkAnswer(answer('faithful'), GROUNDING_SOURCES);
    expect(report.sentences.every((s) => s.verdict === 'supported')).toBe(true);
    expect(report.faithfulness).toBe(1);
  });

  it.each([
    ['number', 'number_mismatch'],
    ['citation', 'misattributed'],
    ['uncited', 'uncited'],
    ['unsupported', 'unsupported'],
  ])('flags the %s answer as %s', (id, verdict) => {
    expect(verdicts(id)).toEqual(['supported', verdict]);
  });

  it('names the figure that is missing from the source', () => {
    const [, second] = checkAnswer(answer('number'), GROUNDING_SOURCES).sentences;
    expect(second.missingNumbers).toEqual(['3']);
  });

  it('lists the claim terms its cited source lacks', () => {
    const [, second] = checkAnswer(answer('unsupported'), GROUNDING_SOURCES).sentences;
    expect(second.missingTerms).toEqual(expect.arrayContaining(['instantly', 'bank', 'transfer']));
  });

  it('points to the source that actually supports a misattributed claim', () => {
    const [, second] = checkAnswer(answer('citation'), GROUNDING_SOURCES).sentences;
    expect(second.betterSourceId).toBe(3);
  });

  it('does not match a number inside a larger number', () => {
    const report = checkAnswer('Refunds take 1 day [1].', [{ id: 1, text: 'Refunds take 14 days.' }]);
    expect(report.sentences[0].missingNumbers).toEqual(['1']);
  });
});
