import { useMemo } from 'react';

const DIMENSIONS = [
  { key: 'stated_vs_actual', short: 'Values vs Reality' },
  { key: 'taste_drift', short: 'Taste Drift' },
  { key: 'blind_spots', short: 'Blind Spots' },
  { key: 'influence_graph', short: 'Influences' },
  { key: 'contextual_variation', short: 'Context' },
  { key: 'linguistic_tells', short: 'Tells' },
  { key: 'falsifiability', short: 'Falsifiability' },
];

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 100;
const LEVELS = 4;

function polarToXY(angle, r) {
  const rad = (angle - 90) * (Math.PI / 180);
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)];
}

export default function SpiderChart({ dimensions = {} }) {
  const angles = DIMENSIONS.map((_, i) => (360 / DIMENSIONS.length) * i);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let level = 1; level <= LEVELS; level++) {
      const r = (RADIUS / LEVELS) * level;
      const points = angles.map((a) => polarToXY(a, r));
      lines.push(points.map((p) => p.join(',')).join(' '));
    }
    return lines;
  }, []);

  const axisLines = angles.map((a) => ({
    x2: polarToXY(a, RADIUS)[0],
    y2: polarToXY(a, RADIUS)[1],
  }));

  const values = DIMENSIONS.map((dim) => {
    const state = dimensions[dim.key];
    if (!state || state.status !== 'done') return 0;
    return state.value ?? 0.7;
  });

  const dataPoints = values.map((v, i) => polarToXY(angles[i], RADIUS * v));
  const dataPath = dataPoints.map((p) => p.join(',')).join(' ');
  const hasData = values.some((v) => v > 0);

  const labels = DIMENSIONS.map((dim, i) => {
    const labelR = RADIUS + 24;
    const [x, y] = polarToXY(angles[i], labelR);
    const state = dimensions[dim.key];
    const isDone = state?.status === 'done';
    const isActive = state?.status === 'active';
    return { x, y, text: dim.short, isDone, isActive, key: dim.key };
  });

  return (
    <div className="spider-chart-container">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {gridLines.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#E8E2DB"
            strokeWidth={i === LEVELS - 1 ? 1 : 0.5}
          />
        ))}

        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={line.x2}
            y2={line.y2}
            stroke="#E8E2DB"
            strokeWidth={0.5}
          />
        ))}

        {hasData && (
          <polygon
            points={dataPath}
            fill="rgba(196, 101, 74, 0.12)"
            stroke="#C4654A"
            strokeWidth={1.5}
            style={{ transition: 'all 600ms ease' }}
          />
        )}

        {dataPoints.map((p, i) =>
          values[i] > 0 ? (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={3}
              fill="#C4654A"
              style={{ transition: 'all 600ms ease' }}
            />
          ) : null
        )}

        {labels.map((l) => (
          <text
            key={l.key}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fontWeight={l.isDone ? 500 : 400}
            fill={l.isActive ? '#C4654A' : l.isDone ? '#2C2825' : '#B5ADA4'}
            style={{ transition: 'fill 300ms ease' }}
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

export { DIMENSIONS };
