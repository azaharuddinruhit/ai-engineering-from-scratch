interface Axis {
  scale: 'linear' | 'log';
  domain: [number, number];
  ticks: number[];
  format: (value: number) => string;
  label: string;
}

interface Series {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  /** Tailwind stroke/text colour classes, e.g. "stroke-teal-500 text-teal-500". */
  className: string;
}

interface Marker {
  x: number;
  /** When set, a dot is drawn at (x, y); otherwise only the vertical guide. */
  y?: number;
  label: string;
  className: string;
}

interface LineChartProps {
  title: string;
  x: Axis;
  y: Axis;
  series: Series[];
  markers?: Marker[];
}

const WIDTH = 640;
const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 40, left: 64 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function fraction(axis: Axis, value: number): number {
  const [min, max] = axis.domain;
  const t =
    axis.scale === 'log'
      ? (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
      : (value - min) / (max - min);
  return Math.min(1, Math.max(0, t));
}

const px = (axis: Axis, value: number) => MARGIN.left + fraction(axis, value) * PLOT_W;
const py = (axis: Axis, value: number) => MARGIN.top + (1 - fraction(axis, value)) * PLOT_H;

/** A small dependency-free SVG line chart that inherits theme colours via Tailwind classes. */
export function LineChart({ title, x, y, series, markers = [] }: LineChartProps) {
  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={title}>
        {y.ticks.map((tick) => (
          <g key={`y${tick}`}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={py(y, tick)}
              y2={py(y, tick)}
              className="stroke-graphite-200 dark:stroke-graphite-800"
            />
            <text
              x={MARGIN.left - 8}
              y={py(y, tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-graphite-500 text-[11px]"
            >
              {y.format(tick)}
            </text>
          </g>
        ))}
        {x.ticks.map((tick) => (
          <text
            key={`x${tick}`}
            x={px(x, tick)}
            y={HEIGHT - MARGIN.bottom + 16}
            textAnchor="middle"
            className="fill-graphite-500 text-[11px]"
          >
            {x.format(tick)}
          </text>
        ))}
        <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 4} textAnchor="middle" className="fill-graphite-500 text-[11px]">
          {x.label}
        </text>
        <text
          transform={`translate(12 ${MARGIN.top + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-graphite-500 text-[11px]"
        >
          {y.label}
        </text>

        {series.map((s) => (
          <polyline
            key={s.id}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            className={s.className}
            points={s.points.map((p) => `${px(x, p.x)},${py(y, p.y)}`).join(' ')}
          />
        ))}

        {markers.map((m) => (
          <g key={m.label} className={m.className}>
            <line
              x1={px(x, m.x)}
              x2={px(x, m.x)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
            {m.y !== undefined && <circle cx={px(x, m.x)} cy={py(y, m.y)} r={5} fill="currentColor" />}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-graphite-600 dark:text-graphite-400">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className={`inline-block h-0.5 w-4 bg-current ${s.className}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
        {markers.map((m) => (
          <span key={m.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-0 border-l-2 border-dashed border-current ${m.className}`} aria-hidden="true" />
            {m.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
