"use client";

export function ProgressRing({
  value, max, size = 120, strokeWidth = 8,
  colorFrom = "#059669", colorTo = "#34d399", label, sublabel,
}: {
  value: number; max: number; size?: number; strokeWidth?: number;
  colorFrom?: string; colorTo?: string; label?: string; sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / (max || 1), 1);
  const offset = circ * (1 - pct);
  const id = `grad-${colorFrom.replace("#","")}-${colorTo.replace("#","")}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeWidth} className="progress-ring-bg" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeWidth}
          stroke={`url(#${id})`} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="progress-ring-fill" />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        {label && <span className="text-2xl font-bold text-gray-900">{label}</span>}
        {sublabel && <span className="text-[10px] text-gray-400 uppercase tracking-wider">{sublabel}</span>}
      </div>
    </div>
  );
}
