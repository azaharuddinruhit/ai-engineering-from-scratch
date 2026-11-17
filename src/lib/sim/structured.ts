import { z } from 'zod';

/** The contract the model must satisfy: triaging a support email into a ticket. */
export const SupportTicket = z.object({
  customerName: z.string().min(1),
  email: z.email(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  priority: z.enum(['low', 'medium', 'high']),
  refundRequested: z.boolean(),
});

export type SupportTicket = z.infer<typeof SupportTicket>;

export type FinishReason = 'stop' | 'length';

export type ExtractionMethod = 'direct' | 'fence' | 'braces';

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationOutcome =
  | { status: 'valid'; method: ExtractionMethod; value: SupportTicket }
  | { status: 'truncated' }
  | { status: 'no_json' }
  | { status: 'parse_error'; method: ExtractionMethod; message: string }
  | { status: 'schema_error'; method: ExtractionMethod; issues: ValidationIssue[] };

/** Pulls a JSON object out of a raw completion: bare JSON, a ```json fence, or the outermost braces. */
export function extractJson(raw: string): { text: string; method: ExtractionMethod } | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return { text: trimmed, method: 'direct' };

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) return { text: fenced[1].trim(), method: 'fence' };

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return start !== -1 && end > start ? { text: trimmed.slice(start, end + 1), method: 'braces' } : null;
}

/** The full parse → validate pipeline every structured-output call should run. */
export function validateCompletion(raw: string, finishReason: FinishReason): ValidationOutcome {
  // A cut-off generation is never "repairable" by re-prompting with the same token budget.
  if (finishReason === 'length') return { status: 'truncated' };

  const extracted = extractJson(raw);
  if (!extracted) return { status: 'no_json' };

  let data: unknown;
  try {
    data = JSON.parse(extracted.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'parse_error', method: extracted.method, message };
  }

  const result = SupportTicket.safeParse(data);
  if (result.success) return { status: 'valid', method: extracted.method, value: result.data };
  return {
    status: 'schema_error',
    method: extracted.method,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/** Feeds precise validation errors back to the model instead of a vague "try again". */
export function buildRepairMessage(outcome: ValidationOutcome): string | null {
  switch (outcome.status) {
    case 'schema_error':
      return [
        'Your previous response did not match the required schema:',
        ...outcome.issues.map((i) => `- ${i.path}: ${i.message}`),
        'Return only the corrected JSON object. No prose, no code fences.',
      ].join('\n');
    case 'parse_error':
      return `Your previous response was not valid JSON (${outcome.message}). Return only a single JSON object.`;
    case 'no_json':
      return 'Your previous response contained no JSON object. Return only a single JSON object.';
    case 'valid':
    case 'truncated':
      return null;
  }
}

export interface StructuredScenario {
  id: string;
  label: string;
  finishReason: FinishReason;
  /** What a free-form completion returned. */
  output: string;
  /** What the same request returns with constrained decoding (strict JSON schema mode) enabled. */
  constrainedOutput: string;
  /** What the retry returns: after the repair message, or with a larger token budget if truncated. */
  repairedOutput: string;
}

const VALID = `{
  "customerName": "Ada Lovelace",
  "email": "ada@example.com",
  "plan": "pro",
  "priority": "high",
  "refundRequested": true
}`;

const TRUNCATED = `{
  "customerName": "Ada Lovelace",
  "email": "ada@exam`;

export const SUPPORT_EMAIL =
  "Hi, this is Ada Lovelace (ada@example.com). I'm on the Pro plan and I was charged twice this month — " +
  'please refund the duplicate charge ASAP, our invoices are due tomorrow.';

export const STRUCTURED_SCENARIOS: readonly StructuredScenario[] = [
  { id: 'clean', label: 'Clean JSON', finishReason: 'stop', output: VALID, constrainedOutput: VALID, repairedOutput: VALID },
  {
    id: 'chatty',
    label: 'Prose + code fence',
    finishReason: 'stop',
    output: `Sure! Here's the ticket you asked for:\n\n\`\`\`json\n${VALID}\n\`\`\`\n\nLet me know if you need anything else.`,
    constrainedOutput: VALID,
    repairedOutput: VALID,
  },
  {
    id: 'types',
    label: 'Wrong types',
    finishReason: 'stop',
    output: VALID.replace('true', '"yes"').replace('"high"', '"urgent"'),
    constrainedOutput: VALID,
    repairedOutput: VALID,
  },
  {
    id: 'missing',
    label: 'Missing field',
    finishReason: 'stop',
    output: VALID.replace(/,\n {2}"plan": "pro"/, ''),
    constrainedOutput: VALID,
    repairedOutput: VALID,
  },
  {
    id: 'syntax',
    label: 'Broken syntax',
    finishReason: 'stop',
    output: VALID.replace('"pro",', '"pro"').replace('"Ada Lovelace"', "'Ada Lovelace'"),
    constrainedOutput: VALID,
    repairedOutput: VALID,
  },
  {
    id: 'truncated',
    label: 'Truncated (max tokens)',
    finishReason: 'length',
    output: TRUNCATED,
    constrainedOutput: TRUNCATED,
    repairedOutput: VALID,
  },
];
