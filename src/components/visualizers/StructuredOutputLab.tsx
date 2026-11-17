import { useId, useState } from 'react';
import {
  buildRepairMessage,
  STRUCTURED_SCENARIOS,
  SUPPORT_EMAIL,
  validateCompletion,
  type FinishReason,
  type ValidationOutcome,
} from '@/lib/sim/structured';
import { LabFrame, LabSection } from './ui/LabFrame';
import { Button, Segmented } from './ui/controls';
import { StatusIcon, type Status } from './ui/StatusIcon';

const MAX_ATTEMPTS = 3;
const INITIAL_SCENARIO = STRUCTURED_SCENARIOS.find((s) => s.id === 'chatty')!;

const SCHEMA_SOURCE = `const SupportTicket = z.object({
  customerName: z.string().min(1),
  email: z.email(),
  plan: z.enum(["free", "pro", "enterprise"]),
  priority: z.enum(["low", "medium", "high"]),
  refundRequested: z.boolean(),
});`;

type StepStatus = Status;

interface Step {
  name: string;
  status: StepStatus;
  detail: string;
}

function pipelineSteps(outcome: ValidationOutcome): Step[] {
  const s = outcome.status;
  const method = 'method' in outcome ? outcome.method : null;
  return [
    {
      name: 'Check finish_reason',
      status: s === 'truncated' ? 'fail' : 'pass',
      detail: s === 'truncated' ? 'length: the token budget ran out mid-object' : 'stop: generation ended naturally',
    },
    {
      name: 'Extract JSON',
      status: s === 'truncated' ? 'skip' : s === 'no_json' ? 'fail' : 'pass',
      detail: s === 'no_json' ? 'no {…} object found' : method ? `found via ${method}` : '',
    },
    {
      name: 'JSON.parse',
      status: s === 'parse_error' ? 'fail' : s === 'schema_error' || s === 'valid' ? 'pass' : 'skip',
      detail: outcome.status === 'parse_error' ? outcome.message : '',
    },
    {
      name: 'Validate against schema',
      status: s === 'valid' ? 'pass' : s === 'schema_error' ? 'fail' : 'skip',
      detail:
        outcome.status === 'schema_error'
          ? outcome.issues.map((i) => `${i.path}: ${i.message}`).join(' · ')
          : s === 'valid'
            ? 'typed SupportTicket object'
            : '',
    },
  ];
}

const STATUS_STYLES: Record<StepStatus, { className: string; label: string }> = {
  pass: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', label: 'passed' },
  fail: { className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400', label: 'failed' },
  skip: { className: 'bg-graphite-100 text-graphite-600 dark:bg-graphite-900 dark:text-graphite-400', label: 'skipped' },
};

export default function StructuredOutputLab() {
  const outputId = useId();
  const [scenarioId, setScenarioId] = useState(INITIAL_SCENARIO.id);
  const [constrained, setConstrained] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [output, setOutput] = useState(INITIAL_SCENARIO.output);
  const [finishReason, setFinishReason] = useState<FinishReason>(INITIAL_SCENARIO.finishReason);

  const scenario = STRUCTURED_SCENARIOS.find((s) => s.id === scenarioId)!;

  const load = (id: string, isConstrained: boolean) => {
    const next = STRUCTURED_SCENARIOS.find((s) => s.id === id)!;
    setScenarioId(id);
    setConstrained(isConstrained);
    setAttempt(1);
    setOutput(isConstrained ? next.constrainedOutput : next.output);
    setFinishReason(next.finishReason);
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    setOutput(scenario.repairedOutput);
    setFinishReason('stop');
  };

  const outcome = validateCompletion(output, finishReason);
  const repairMessage = buildRepairMessage(outcome);
  const canRetry = attempt < MAX_ATTEMPTS;

  return (
    <LabFrame
      title="Structured Output Validator"
      description="Run raw model completions through the extract → parse → validate → repair pipeline and see which failures constrained decoding removes."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <LabSection title="Input email">
          <p className="rounded-lg bg-graphite-50 p-3 text-xs leading-relaxed dark:bg-graphite-900">{SUPPORT_EMAIL}</p>
        </LabSection>
        <LabSection title="Target schema (Zod)">
          <pre className="overflow-x-auto rounded-lg bg-graphite-50 p-3 font-mono text-[11px] leading-relaxed dark:bg-graphite-900">
            {SCHEMA_SOURCE}
          </pre>
        </LabSection>
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <Segmented
          label="What the model returned"
          value={scenarioId}
          onChange={(id) => load(id, constrained)}
          options={STRUCTURED_SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
        />
        <label className="flex cursor-pointer items-center gap-2 font-medium text-graphite-800 dark:text-graphite-200">
          <input
            type="checkbox"
            checked={constrained}
            onChange={(e) => load(scenarioId, e.target.checked)}
            className="size-4 accent-teal-600"
          />
          Constrained decoding (strict schema mode)
        </label>
      </div>

      <LabSection title={`Attempt ${attempt} of ${MAX_ATTEMPTS} · raw completion`}>
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="text-muted">finish_reason:</span>
          <code
            className={`rounded px-1.5 py-0.5 font-mono ${
              finishReason === 'length'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                : 'bg-graphite-100 dark:bg-graphite-900'
            }`}
          >
            {finishReason === 'length' ? 'length (max_tokens)' : 'stop'}
          </code>
          <span className="text-muted">· edit the text to try your own failure</span>
        </div>
        <label htmlFor={outputId} className="sr-only">
          Raw model completion
        </label>
        <textarea
          id={outputId}
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          rows={9}
          spellCheck={false}
          className="w-full rounded-lg border border-graphite-200 bg-graphite-50 p-3 font-mono text-xs leading-relaxed dark:border-graphite-800 dark:bg-graphite-900"
        />
      </LabSection>

      <LabSection title="Validation pipeline">
        <ol className="space-y-2">
          {pipelineSteps(outcome).map((step) => {
            const style = STATUS_STYLES[step.status];
            return (
              <li key={step.name} className="flex items-start gap-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full ${style.className}`}
                  role="img"
                  aria-label={style.label}
                >
                  <StatusIcon status={step.status} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium text-heading">{step.name}</p>
                  {step.detail && <p className="break-words font-mono text-xs text-muted">{step.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </LabSection>

      <div role="status" aria-live="polite">
        {outcome.status === 'valid' ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Accepted on attempt {attempt}. Safe to hand to downstream code.
            </p>
            <pre className="mt-2 overflow-x-auto font-mono text-xs">{JSON.stringify(outcome.value, null, 2)}</pre>
          </div>
        ) : (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            {outcome.status === 'truncated' ? (
              <p className="text-rose-800 dark:text-rose-300">
                <strong>Truncated.</strong> Don't ask the model to "fix" a cut-off object: retry with a larger{' '}
                <code>max_tokens</code> or a smaller output. Constrained decoding cannot prevent this.
              </p>
            ) : (
              <>
                <p className="font-semibold text-rose-800 dark:text-rose-300">Rejected. Repair message sent back to the model:</p>
                <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{repairMessage}</pre>
              </>
            )}
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={retry} disabled={!canRetry}>
                {outcome.status === 'truncated' ? 'Retry with larger max_tokens' : 'Send repair & retry'}
              </Button>
              {!canRetry && (
                <span className="text-xs text-rose-700 dark:text-rose-400">
                  Retry budget exhausted: fail loudly and log the trace.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </LabFrame>
  );
}
