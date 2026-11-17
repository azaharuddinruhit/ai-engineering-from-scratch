import { useMemo, useState } from 'react';
import {
  apiMonthlyCostUsd,
  breakEvenRequestsPerDay,
  costCurve,
  DAYS_PER_MONTH,
  selfHostMonthlyCost,
  type SelfHostConfig,
} from '@/lib/sim/buildVsBuy';
import { formatUsd, PRICE_TIERS } from '@/lib/sim/pricing';
import { LabFrame, LabSection } from './ui/LabFrame';
import { LineChart } from './ui/LineChart';
import { Segmented, Slider, Stat } from './ui/controls';

const VOLUME_RANGE: [number, number] = [10, 10_000_000];
const VOLUME_TICKS = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export default function BuildVsBuyCalculator() {
  // Volume slider moves in log10 space so 10 → 10M requests/day is usable.
  const [logVolume, setLogVolume] = useState(4.3);
  const [inputTokens, setInputTokens] = useState(1500);
  const [outputTokens, setOutputTokens] = useState(400);
  const [tierId, setTierId] = useState('mid');
  const [config, setConfig] = useState<SelfHostConfig>({
    gpuHourlyUsd: 2.5,
    outputTokensPerSecondPerGpu: 1500,
    targetUtilization: 0.5,
    minGpus: 2,
    opsOverheadUsdPerMonth: 4000,
  });
  const update = (patch: Partial<SelfHostConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const requestsPerDay = Math.round(10 ** logVolume);
  const tier = PRICE_TIERS.find((t) => t.id === tierId)!;
  const workload = { requestsPerDay, inputTokens, outputTokens };
  const api = apiMonthlyCostUsd(workload, tier);
  const selfHost = selfHostMonthlyCost(workload, config);

  const curve = useMemo(
    () => costCurve({ inputTokens, outputTokens }, tier, config, VOLUME_RANGE),
    [inputTokens, outputTokens, tier, config],
  );
  const breakEven = breakEvenRequestsPerDay(curve);

  const allCosts = curve.flatMap((p) => [p.apiUsd, p.selfHostUsd]);
  const yMin = 10 ** Math.floor(Math.log10(Math.max(1, Math.min(...allCosts))));
  const yMax = 10 ** Math.ceil(Math.log10(Math.max(...allCosts)));
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v *= 10) yTicks.push(v);

  const apiCheaper = api <= selfHost.monthlyUsd;

  return (
    <LabFrame
      title="Build vs. Buy Cost Explorer"
      description="Compare paying per token for a hosted API against renting GPUs to serve an open-weights model yourself."
    >
      <LabSection title="Workload">
        <div className="grid gap-5 md:grid-cols-3">
          <Slider
            label="Requests per day"
            value={logVolume}
            min={1}
            max={7}
            step={0.05}
            onChange={setLogVolume}
            format={() => compact(requestsPerDay)}
          />
          <Slider
            label="Input tokens / request"
            value={inputTokens}
            min={100}
            max={20000}
            step={100}
            onChange={setInputTokens}
            format={(v) => v.toLocaleString()}
          />
          <Slider
            label="Output tokens / request"
            value={outputTokens}
            min={50}
            max={4000}
            step={50}
            onChange={setOutputTokens}
            format={(v) => v.toLocaleString()}
          />
        </div>
      </LabSection>

      <div className="grid gap-8 md:grid-cols-2">
        <LabSection title="Option A · Hosted API">
          <Segmented
            label="Model class"
            value={tierId}
            onChange={setTierId}
            options={PRICE_TIERS.map((t) => ({ value: t.id, label: t.label }))}
          />
          <p className="mt-2 text-xs text-muted">
            ${tier.inputPerMTok} input / ${tier.outputPerMTok} output per 1M tokens (illustrative).
          </p>
        </LabSection>
        <LabSection title="Option B · Self-hosted open weights">
          <div className="space-y-4">
            <Slider
              label="GPU price"
              value={config.gpuHourlyUsd}
              min={0.5}
              max={8}
              step={0.25}
              onChange={(v) => update({ gpuHourlyUsd: v })}
              format={(v) => `$${v.toFixed(2)}/h`}
            />
            <Slider
              label="Decode throughput per GPU"
              value={config.outputTokensPerSecondPerGpu}
              min={200}
              max={6000}
              step={100}
              onChange={(v) => update({ outputTokensPerSecondPerGpu: v })}
              format={(v) => `${v.toLocaleString()} tok/s`}
              hint="Aggregate with continuous batching; depends on model size and hardware."
            />
            <Slider
              label="Sustainable utilisation"
              value={config.targetUtilization}
              min={0.2}
              max={0.9}
              step={0.05}
              onChange={(v) => update({ targetUtilization: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              hint="Headroom for traffic peaks: you pay for idle GPUs."
            />
            <Slider
              label="Minimum GPUs (redundancy)"
              value={config.minGpus}
              min={1}
              max={4}
              step={1}
              onChange={(v) => update({ minGpus: v })}
            />
            <Slider
              label="Ops & engineering overhead"
              value={config.opsOverheadUsdPerMonth}
              min={0}
              max={20000}
              step={500}
              onChange={(v) => update({ opsOverheadUsdPerMonth: v })}
              format={(v) => `${formatUsd(v)}/mo`}
            />
          </div>
        </LabSection>
      </div>

      <div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="API / month" value={formatUsd(api)} tone={apiCheaper ? 'good' : 'bad'} />
          <Stat
            label="Self-host / month"
            value={formatUsd(selfHost.monthlyUsd)}
            hint={`${selfHost.gpus} GPU${selfHost.gpus === 1 ? '' : 's'}`}
            tone={apiCheaper ? 'bad' : 'good'}
          />
          <Stat
            label="Best cost per 1K requests"
            value={formatUsd((Math.min(api, selfHost.monthlyUsd) / (requestsPerDay * DAYS_PER_MONTH)) * 1000)}
          />
          <Stat
            label="Break-even volume"
            value={breakEven ? `${compact(breakEven)}/day` : 'never'}
            hint={breakEven ? 'self-hosting cheaper above this' : 'API cheaper at every volume'}
          />
        </dl>
        <p className="mt-3 text-sm" role="status">
          At {compact(requestsPerDay)} requests/day the <strong>{apiCheaper ? 'hosted API' : 'self-hosted model'}</strong>{' '}
          is cheaper by {formatUsd(Math.abs(api - selfHost.monthlyUsd))}/month.
        </p>
      </div>

      <LineChart
        title="Monthly cost against daily request volume, log scales"
        x={{ scale: 'log', domain: VOLUME_RANGE, ticks: VOLUME_TICKS, format: compact, label: 'Requests per day' }}
        y={{ scale: 'log', domain: [yMin, yMax], ticks: yTicks, format: (v) => `$${compact(v)}`, label: 'USD / month' }}
        series={[
          {
            id: 'api',
            label: 'Hosted API',
            points: curve.map((p) => ({ x: p.requestsPerDay, y: p.apiUsd })),
            className: 'stroke-teal-500 text-teal-500',
          },
          {
            id: 'self',
            label: 'Self-hosted (steps = GPUs added)',
            points: curve.map((p) => ({ x: p.requestsPerDay, y: p.selfHostUsd })),
            className: 'stroke-amber-500 text-amber-500',
          },
        ]}
        markers={[{ x: requestsPerDay, label: 'Your volume', className: 'text-muted' }]}
      />
    </LabFrame>
  );
}
