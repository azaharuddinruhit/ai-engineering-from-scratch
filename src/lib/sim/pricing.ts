export interface PriceTier {
  id: string;
  label: string;
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
}

/**
 * Illustrative price tiers that reflect the typical spread between model classes.
 * Always check your provider's current price sheet before budgeting.
 */
export const PRICE_TIERS: readonly PriceTier[] = [
  { id: 'small', label: 'Small / fast model', inputPerMTok: 0.1, outputPerMTok: 0.5 },
  { id: 'mid', label: 'Mid-tier model', inputPerMTok: 2, outputPerMTok: 10 },
  { id: 'frontier', label: 'Frontier model', inputPerMTok: 5, outputPerMTok: 25 },
];

export function tokenCostUsd(tokens: number, usdPerMTok: number): number {
  return (tokens * usdPerMTok) / 1_000_000;
}

export function requestCostUsd(inputTokens: number, outputTokens: number, tier: PriceTier): number {
  return tokenCostUsd(inputTokens, tier.inputPerMTok) + tokenCostUsd(outputTokens, tier.outputPerMTok);
}

export function formatUsd(value: number): string {
  if (value === 0) return '$0';
  if (value < 0.01) return `$${value.toPrecision(2)}`;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}
