const PATHS = {
  pass: 'M5 12.5l4.5 4.5L19 7.5',
  fail: 'M7 7l10 10M17 7L7 17',
  skip: 'M7 12h10',
} as const;

export type Status = keyof typeof PATHS;

/** Drawn pass / fail / skip marks shared by the labs, so status never depends on a font's glyphs. */
export function StatusIcon({ status, className = 'size-3.5' }: { status: Status; className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[status]} />
    </svg>
  );
}
