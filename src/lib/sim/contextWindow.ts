/**
 * Models two context-window effects:
 *  1. Budget: every prompt section competes for a fixed window; documents that don't fit are dropped.
 *  2. Position: recall of a fact depends on where it sits ("Lost in the Middle", Liu et al., 2023).
 *
 * The recall curve is illustrative: U-shaped, deeper as more documents are packed in, with a slightly
 * stronger primacy than recency effect. Real curves vary by model and must be measured with your own evals.
 */

export interface BudgetInput {
  windowTokens: number;
  systemTokens: number;
  fewShotTokens: number;
  docTokens: number;
  docCount: number;
  questionTokens: number;
  outputReserveTokens: number;
}

export interface BudgetSegment {
  id: 'system' | 'fewShot' | 'docs' | 'question' | 'output';
  label: string;
  tokens: number;
}

export interface Budget {
  segments: BudgetSegment[];
  /** How many retrieved documents fit after every other section is reserved. */
  docsThatFit: number;
  droppedDocs: number;
  usedTokens: number;
}

export function contextBudget(input: BudgetInput): Budget {
  const fixed = input.systemTokens + input.fewShotTokens + input.questionTokens + input.outputReserveTokens;
  const room = Math.max(0, input.windowTokens - fixed);
  const docsThatFit = Math.min(input.docCount, Math.floor(room / input.docTokens));
  const segments: BudgetSegment[] = [
    { id: 'system', label: 'System prompt', tokens: input.systemTokens },
    { id: 'fewShot', label: 'Few-shot examples', tokens: input.fewShotTokens },
    { id: 'docs', label: 'Retrieved documents', tokens: docsThatFit * input.docTokens },
    { id: 'question', label: 'User question', tokens: input.questionTokens },
    { id: 'output', label: 'Output reserve', tokens: input.outputReserveTokens },
  ];
  return {
    segments,
    docsThatFit,
    droppedDocs: input.docCount - docsThatFit,
    usedTokens: segments.reduce((acc, s) => acc + s.tokens, 0),
  };
}

const MAX_MIDDLE_DROP = 0.32;
const PRIMACY_RECALL = 0.92;
const RECENCY_PENALTY = 0.04;

/** Estimated probability that the model uses a fact at `position` (0-based) among `docCount` docs. */
export function recallAtPosition(position: number, docCount: number): number {
  if (docCount <= 1) return PRIMACY_RECALL;
  const p = position / (docCount - 1);
  const depth = MAX_MIDDLE_DROP * (1 - Math.exp(-(docCount - 1) / 10));
  return PRIMACY_RECALL - RECENCY_PENALTY * p - depth * 4 * p * (1 - p);
}

export type DocOrdering = 'rank' | 'edgesFirst';

/**
 * Position of the document with retrieval rank `rank` (0-based) in the prompt.
 * 'rank' keeps retrieval order; 'edgesFirst' alternates the best documents between the start and
 * end of the context so the weakest ones land in the middle.
 */
export function positionOf(rank: number, docCount: number, ordering: DocOrdering): number {
  if (ordering === 'rank') return rank;
  return rank % 2 === 0 ? rank / 2 : docCount - 1 - (rank - 1) / 2;
}
