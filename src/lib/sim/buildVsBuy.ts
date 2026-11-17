import { tokenCostUsd } from './pricing';

const HOURS_PER_MONTH = 730;
export const DAYS_PER_MONTH = HOURS_PER_MONTH / 24;
const SECONDS_PER_DAY = 86_400;

export interface Workload {
  requestsPerDay: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ApiPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface SelfHostConfig {
  gpuHourlyUsd: number;
  /** Aggregate decode throughput of one GPU with continuous batching. */
  outputTokensPerSecondPerGpu: number;
  /** Average utilisation you can sustain while still absorbing traffic peaks (0–1). */
  targetUtilization: number;
  /** Floor for redundancy: one GPU is a single point of failure. */
  minGpus: number;
  /** Engineering + on-call + monitoring cost of owning the serving stack. */
  opsOverheadUsdPerMonth: number;
}

export interface SelfHostCost {
  gpus: number;
  monthlyUsd: number;
}

export function apiMonthlyCostUsd(workload: Workload, pricing: ApiPricing): number {
  const perRequest =
    tokenCostUsd(workload.inputTokens, pricing.inputPerMTok) +
    tokenCostUsd(workload.outputTokens, pricing.outputPerMTok);
  return perRequest * workload.requestsPerDay * DAYS_PER_MONTH;
}

/** Sizes the fleet on decode throughput, the usual bottleneck. Prefill is ignored for simplicity. */
export function selfHostMonthlyCost(workload: Workload, config: SelfHostConfig): SelfHostCost {
  const averageOutputTps = (workload.requestsPerDay * workload.outputTokens) / SECONDS_PER_DAY;
  const usableTpsPerGpu = config.outputTokensPerSecondPerGpu * config.targetUtilization;
  const gpus = Math.max(config.minGpus, Math.ceil(averageOutputTps / usableTpsPerGpu));
  return {
    gpus,
    monthlyUsd: gpus * config.gpuHourlyUsd * HOURS_PER_MONTH + config.opsOverheadUsdPerMonth,
  };
}

export interface CostPoint {
  requestsPerDay: number;
  apiUsd: number;
  selfHostUsd: number;
}

/** Log-spaced cost curves for both options between the given request volumes. */
export function costCurve(
  workload: Omit<Workload, 'requestsPerDay'>,
  pricing: ApiPricing,
  config: SelfHostConfig,
  [minRequests, maxRequests]: [number, number],
  points = 120,
): CostPoint[] {
  const logMin = Math.log10(minRequests);
  const step = (Math.log10(maxRequests) - logMin) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const requestsPerDay = 10 ** (logMin + i * step);
    const w = { ...workload, requestsPerDay };
    return {
      requestsPerDay,
      apiUsd: apiMonthlyCostUsd(w, pricing),
      selfHostUsd: selfHostMonthlyCost(w, config).monthlyUsd,
    };
  });
}

/** First volume on the curve where self-hosting becomes cheaper, or null if it never does. */
export function breakEvenRequestsPerDay(curve: readonly CostPoint[]): number | null {
  return curve.find((p) => p.selfHostUsd <= p.apiUsd)?.requestsPerDay ?? null;
}
