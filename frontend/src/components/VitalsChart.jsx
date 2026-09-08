const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 20, right: 20, bottom: 30, left: 40 };

const SERIES = [
  { key: 'systolic', label: 'Systolic BP', color: '#255A50' },
  { key: 'diastolic', label: 'Diastolic BP', color: '#8FBAAF' },
  { key: 'heartRate', label: 'Heart rate', color: '#A6752C' },
];

export default function VitalsChart({ labResults }) {
  const points = labResults
    .filter((l) => l.result_data && typeof l.result_data === 'object')
    .map((l) => ({ date: new Date(l.fetched_at), ...l.result_data }))
    .sort((a, b) => a.date - b.date);

  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">Not enough lab results yet to plot a trend.</p>
    );
  }

  const allValues = points.flatMap((p) => SERIES.map((s) => p[s.key]).filter((v) => typeof v === 'number'));
  const minY = Math.min(...allValues) - 5;
  const maxY = Math.max(...allValues) + 5;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const xFor = (i) => PAD.left + (i / (points.length - 1)) * innerW;
  const yFor = (v) => PAD.top + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + (i / yTicks) * (maxY - minY));

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Vitals trend chart">
        {/* Gridlines + Y axis labels */}
        {yTickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#DCE3E0"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={yFor(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#5B6E69">
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* X axis date labels (first, middle, last) */}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#5B6E69"
          >
            {points[i].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {/* Series lines */}
        {SERIES.map((s) => {
          const path = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p[s.key])}`)
            .join(' ');
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" />
              {points.map((p, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(p[s.key])} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
