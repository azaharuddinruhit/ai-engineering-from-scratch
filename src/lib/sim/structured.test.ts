import { describe, expect, it } from 'vitest';
import { buildRepairMessage, extractJson, STRUCTURED_SCENARIOS, validateCompletion } from './structured';

const scenario = (id: string) => STRUCTURED_SCENARIOS.find((s) => s.id === id)!;

describe('extractJson', () => {
  it.each([
    ['{"a":1}', 'direct'],
    ['Here you go:\n```json\n{"a":1}\n```', 'fence'],
    ['The answer is {"a":1} as requested.', 'braces'],
  ] as const)('extracts %j via %s', (raw, method) => {
    expect(extractJson(raw)).toEqual({ text: '{"a":1}', method });
  });

  it('returns null when there is no object', () => {
    expect(extractJson('I cannot help with that.')).toBeNull();
  });
});

describe('validateCompletion', () => {
  it.each([
    ['clean', 'valid'],
    ['chatty', 'valid'],
    ['types', 'schema_error'],
    ['missing', 'schema_error'],
    ['syntax', 'parse_error'],
    ['truncated', 'truncated'],
  ])('classifies the %s scenario as %s', (id, status) => {
    const s = scenario(id);
    expect(validateCompletion(s.output, s.finishReason).status).toBe(status);
  });

  it('reports every schema violation with its path', () => {
    const outcome = validateCompletion(scenario('types').output, 'stop');
    expect(outcome.status === 'schema_error' && outcome.issues.map((i) => i.path).sort()).toEqual([
      'priority',
      'refundRequested',
    ]);
  });

  it('constrained decoding fixes every scenario except truncation', () => {
    for (const s of STRUCTURED_SCENARIOS) {
      const expected = s.finishReason === 'length' ? 'truncated' : 'valid';
      expect(validateCompletion(s.constrainedOutput, s.finishReason).status).toBe(expected);
    }
  });

  it('every retry produces a valid ticket', () => {
    for (const s of STRUCTURED_SCENARIOS) {
      expect(validateCompletion(s.repairedOutput, 'stop').status).toBe('valid');
    }
  });
});

describe('buildRepairMessage', () => {
  it('quotes the failing fields back to the model', () => {
    const message = buildRepairMessage(validateCompletion(scenario('missing').output, 'stop'));
    expect(message).toContain('- plan:');
  });

  it('does not ask the model to repair a truncated or valid response', () => {
    expect(buildRepairMessage({ status: 'truncated' })).toBeNull();
    expect(buildRepairMessage(validateCompletion(scenario('clean').output, 'stop'))).toBeNull();
  });
});
