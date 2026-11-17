import { useId, type ReactNode } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Formats the current value for display and for screen readers. */
  format?: (value: number) => string;
  hint?: string;
}

export function Slider({ label, value, min, max, step, onChange, format = String, hint }: SliderProps) {
  const id = useId();
  const display = format(value);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-medium text-graphite-800 dark:text-graphite-200">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-xs text-graphite-600 dark:text-graphite-400">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A radio group styled as a segmented control: arrow keys move between options natively. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 font-medium text-graphite-800 dark:text-graphite-200">{label}</legend>
      {/* Options stretch, so a row that wraps in a narrow column or on a phone stays balanced. */}
      <div className="flex w-full flex-wrap gap-1 rounded-lg bg-graphite-100 p-1 sm:inline-flex sm:w-auto dark:bg-graphite-900">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex-auto cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-center text-xs font-medium sm:py-1 text-graphite-600 has-checked:bg-white has-checked:text-heading has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-teal-500 dark:text-graphite-400 dark:has-checked:bg-graphite-700 dark:has-checked:text-heading"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'bad';
}

const STAT_TONES = {
  default: 'text-heading',
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
} as const;

export function Stat({ label, value, hint, tone = 'default' }: StatProps) {
  return (
    <div className="rounded-lg border border-graphite-200 px-3 py-2.5 dark:border-graphite-800">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 font-mono text-base font-semibold ${STAT_TONES[tone]}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-teal-600 text-white hover:bg-teal-700'
      : 'border border-graphite-300 text-graphite-800 hover:bg-graphite-50 dark:border-graphite-700 dark:text-graphite-200 dark:hover:bg-graphite-900';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
