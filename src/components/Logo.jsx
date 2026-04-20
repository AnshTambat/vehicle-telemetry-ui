/**
 * VehicleIQ Brand Mark
 * Speedometer-style gauge with live-indicator needle tip.
 * Inspired by automotive service iconography — speedometer + intelligence pulse.
 */
export default function Logo({ size = 40 }) {
  const cx = 22, cy = 22, r = 13.5;
  const circ = 2 * Math.PI * r;          // 84.82
  const arcLen = circ * 0.75;            // 270° sweep = 63.62
  const fillLen = arcLen * 0.72;         // needle at 72% = "high speed"

  // Needle tip angle: arc starts at 135° (SVG CW from right), 72% of 270° = 194.4°
  // Tip angle from right (CW): 135 + 194.4 = 329.4°
  const tipDeg  = 135 + 0.72 * 270;
  const tipRad  = (tipDeg * Math.PI) / 180;
  const needleR = 10.5;
  const tipX    = (cx + needleR * Math.cos(tipRad)).toFixed(2);
  const tipY    = (cy + needleR * Math.sin(tipRad)).toFixed(2);
  // tipX ≈ 31.44, tipY ≈ 16.63  →  points upper-right ✓

  return (
    <svg
      viewBox="0 0 44 44"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VehicleIQ logo"
    >
      {/* ── Background tile ── */}
      <rect width="44" height="44" rx="10" fill="#1d4ed8" />

      {/* ── Subtle inner shadow ring ── */}
      <circle cx={cx} cy={cy} r="18"
        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* ── Gauge track (full 270° arc, dim) ── */}
      <circle
        cx={cx} cy={cy} r={r}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${arcLen.toFixed(2)} ${circ.toFixed(2)}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />

      {/* ── Gauge fill (72% = high performance) ── */}
      <circle
        cx={cx} cy={cy} r={r}
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${fillLen.toFixed(2)} ${circ.toFixed(2)}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />

      {/* ── Tick marks at 0%, 50%, 100% on track ── */}
      {/* 0%  → 135° from right → (cx+r·cos135, cy+r·sin135) */}
      {/* 50% → 135+135=270° → (cx+r·cos270, cy+r·sin270)   */}
      {/* 100%→ 135+270=405=45° → (cx+r·cos45, cy+r·sin45)  */}
      {[0, 0.5, 1].map(pct => {
        const a = ((135 + pct * 270) * Math.PI) / 180;
        const ox = (cx + r * Math.cos(a)).toFixed(2);
        const oy = (cy + r * Math.sin(a)).toFixed(2);
        const ix = (cx + (r - 3) * Math.cos(a)).toFixed(2);
        const iy = (cy + (r - 3) * Math.sin(a)).toFixed(2);
        return (
          <line key={pct}
            x1={ox} y1={oy} x2={ix} y2={iy}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}

      {/* ── Needle ── */}
      <line
        x1={cx} y1={cy}
        x2={tipX} y2={tipY}
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* ── Centre pivot ── */}
      <circle cx={cx} cy={cy} r="2.8" fill="white" />

      {/* ── Live tip dot (amber = active/live) ── */}
      <circle cx={tipX} cy={tipY} r="2.2" fill="#fbbf24" />
      {/* outer glow ring on tip */}
      <circle cx={tipX} cy={tipY} r="3.8"
        stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}
