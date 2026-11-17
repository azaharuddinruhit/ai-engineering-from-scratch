import type { ReactNode } from 'react';

interface LabFrameProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Common chrome for every interactive playground; opts out of lesson prose styles. */
export function LabFrame({ title, description, children }: LabFrameProps) {
  return (
    <section
      aria-label={title}
      className="not-prose my-8 overflow-hidden rounded-xl border border-graphite-200 bg-white shadow-sm dark:border-graphite-800 dark:bg-graphite-950"
    >
      <header className="border-b border-graphite-200 bg-graphite-50 px-5 py-4 dark:border-graphite-800 dark:bg-graphite-900/60">
        <h3 className="text-lg font-semibold text-heading">{title}</h3>
        <p className="mt-1 text-sm text-graphite-600 dark:text-graphite-400">{description}</p>
      </header>
      <div className="space-y-8 p-5 text-sm text-graphite-700 dark:text-graphite-300">{children}</div>
    </section>
  );
}

export function LabSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-heading">{title}</h4>
      {children}
    </div>
  );
}
