export default function MetricRing({
  value,
  max = 100,
  color = "#0d9488",
  label,
  sublabel,
  size = 80,
}) {
  const pct = Math.min(1, value / max);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#d7cab8"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: size * 0.22, fontWeight: 700, fill: "#1f2b28" }}
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-xs font-medium text-[var(--sage-text)] text-center">{label}</span>
      {sublabel && <span className="text-xs text-[var(--sage-muted)] text-center">{sublabel}</span>}
    </div>
  );
}
