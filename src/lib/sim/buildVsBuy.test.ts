import { describe, expect, it } from 'vitest';
import {
  apiMonthlyCostUsd,
  breakEvenRequestsPerDay,
  costCurve,
  selfHostMonthlyCost,
  type SelfHostConfig,
} from './buildVsBuy';

const pricing = { inputPerMTok: 2, outputPerMTok: 10 };
const tokens = { inputTokens: 1_000, outputTokens: 500 };
const config: SelfHostConfig = {
  gpuHourlyUsd: 2,
  outputTokensPerSecondPerGpu: 1_000,
  targetUtilization: 0.5,
  minGpus: 2,
  opsOverheadUsdPerMonth: 1_000,
};

describe('apiMonthlyCostUsd', () => {
  it('scales linearly with volume', () => {
    // Per request: 1000 × $2/M + 500 × $10/M = $0.007; × 1000/day × 730/24 days.
    expect(apiMonthlyCostUsd({ ...tokens, requestsPerDay: 1_000 }, pricing)).toBeCloseTo(0.007 * 1_000 * (730 / 24));
  });
});

describe('selfHostMonthlyCost', () => {
  it('never drops below the redundancy floor', () => {
    expect(selfHostMonthlyCost({ ...tokens, requestsPerDay: 1 }, config)).toEqual({
      gpus: 2,
      monthlyUsd: 2 * 2 * 730 + 1_000,
    });
  });

  it('adds GPUs when average decode demand exceeds usable capacity', () => {
    // 864,000 req/day × 500 tokens / 86,400 s = 5,000 tok/s; 500 usable tok/s per GPU → 10 GPUs.
    expect(selfHostMonthlyCost({ ...tokens, requestsPerDay: 864_000 }, config).gpus).toBe(10);
  });
});

describe('breakEvenRequestsPerDay', () => {
  it('finds the volume where self-hosting becomes cheaper', () => {
    const curve = costCurve(tokens, pricing, config, [100, 10_000_000]);
    const breakEven = breakEvenRequestsPerDay(curve);
    expect(breakEven).not.toBeNull();
    const w = { ...tokens, requestsPerDay: breakEven! };
    expect(selfHostMonthlyCost(w, config).monthlyUsd).toBeLessThanOrEqual(apiMonthlyCostUsd(w, pricing));
  });

  it('returns null when the API stays cheaper across the range', () => {
    const cheapApi = { inputPerMTok: 0.01, outputPerMTok: 0.01 };
    expect(breakEvenRequestsPerDay(costCurve(tokens, cheapApi, config, [100, 1_000_000]))).toBeNull();
  });
});
