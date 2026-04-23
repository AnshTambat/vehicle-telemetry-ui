import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getVehicles, getReadings, getTop5Today, getLatestReading } from '../services/api';

/* ── palette for per-vehicle scatter dots ── */
const COLORS = [
  '#60a5fa','#34d399','#f59e0b','#f87171','#a78bfa',
  '#38bdf8','#4ade80','#fb923c','#e879f9','#94a3b8',
];

function StatCard({ label, value, unit, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: color || 'var(--text-h)', lineHeight: 1 }}>
        {value ?? '—'}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 5, color: 'var(--text)' }}>{unit}</span>}
      </p>
    </div>
  );
}

function ChartCard({ title, tag, children }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <div className="card-head">
        <h3>{title}</h3>
        {tag && <span className="card-tag">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function getRangeFromTo(range) {
  const now = new Date();
  const from = new Date(now);
  if (range === '24h') from.setHours(now.getHours() - 24);
  else if (range === '7d') from.setDate(now.getDate() - 7);
  else if (range === '30d') from.setDate(now.getDate() - 30);
  return { from: from.toISOString(), to: now.toISOString() };
}

function bucketReadings(readings, range) {
  if (!readings.length) return [];
  const fmt = (d) => range === '24h' ? `${d.getHours()}:00` : `${d.getMonth() + 1}/${d.getDate()}`;
  const buckets = {};
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const key = range === '24h'
      ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
      : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (!buckets[key]) buckets[key] = { label: fmt(new Date(key)), speeds: [], temps: [] };
    buckets[key].speeds.push(r.speed);
    buckets[key].temps.push(r.engineTemp);
  }
  return Object.values(buckets)
    .sort((a, b) => {
      const ka = a.label.includes(':') ? parseInt(a.label) : a.label;
      const kb = b.label.includes(':') ? parseInt(b.label) : b.label;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .map(b => ({
      label: b.label,
      'Avg Speed': +(b.speeds.reduce((s, v) => s + v, 0) / b.speeds.length).toFixed(1),
      'Avg Temp':  +(b.temps.reduce((s, v) => s + v, 0) / b.temps.length).toFixed(1),
    }));
}

const empty = (text) => (
  <p style={{ color: 'var(--text)', textAlign: 'center', padding: '48px 0', margin: 0, fontSize: 13 }}>{text}</p>
);

const tip = {
  contentStyle: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 },
};

/* Custom tooltip for scatter chart */
/* ── GPS Map component ── */
function GpsMap({ locations }) {
  const [hovered, setHovered] = useState(null);
  const W = 520, H = 260, PAD = 36;

  const points = locations.map(s => ({ ...s, lat: s.data[0].lat, lon: s.data[0].lon }));

  if (!points.length) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontSize: 13 }}>
      No location data available
    </div>
  );

  const lats = points.map(p => p.lat), lons = points.map(p => p.lon);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLon = Math.min(...lons), maxLon = Math.max(...lons);

  // add padding so single-point doesn't collapse
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lonSpan = Math.max(maxLon - minLon, 0.01);
  minLat -= latSpan * 0.25; maxLat += latSpan * 0.25;
  minLon -= lonSpan * 0.25; maxLon += lonSpan * 0.25;

  const toX = (lon) => PAD + ((lon - minLon) / (maxLon - minLon)) * (W - PAD * 2);
  const toY = (lat) => (H - PAD) - ((lat - minLat) / (maxLat - minLat)) * (H - PAD * 2);

  // grid lines
  const GRID = 4;
  const gridLats = Array.from({ length: GRID + 1 }, (_, i) => minLat + (i / GRID) * (maxLat - minLat));
  const gridLons = Array.from({ length: GRID + 1 }, (_, i) => minLon + (i / GRID) * (maxLon - minLon));

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#0d1b2a' }}>
        {/* ── map tile–style background blocks ── */}
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (_, c) => {
            const x = PAD + c * ((W - PAD * 2) / GRID);
            const y = PAD + r * ((H - PAD * 2) / GRID);
            const w = (W - PAD * 2) / GRID;
            const h = (H - PAD * 2) / GRID;
            const shade = (r + c) % 2 === 0 ? '#0f2035' : '#0d1b2a';
            return <rect key={`${r}-${c}`} x={x} y={y} width={w} height={h} fill={shade} />;
          })
        )}

        {/* ── grid lines ── */}
        {gridLats.map((lat, i) => (
          <line key={`lat-${i}`} x1={PAD} x2={W - PAD} y1={toY(lat)} y2={toY(lat)}
            stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="3 4" />
        ))}
        {gridLons.map((lon, i) => (
          <line key={`lon-${i}`} x1={toX(lon)} x2={toX(lon)} y1={PAD} y2={H - PAD}
            stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="3 4" />
        ))}

        {/* ── axis labels ── */}
        {gridLats.filter((_, i) => i % 2 === 0).map((lat, i) => (
          <text key={`lbl-lat-${i}`} x={PAD - 4} y={toY(lat) + 3} textAnchor="end"
            fontSize="8" fill="#4a7fa5" fontFamily="ui-monospace,monospace">
            {lat.toFixed(3)}
          </text>
        ))}
        {gridLons.filter((_, i) => i % 2 === 0).map((lon, i) => (
          <text key={`lbl-lon-${i}`} x={toX(lon)} y={H - PAD + 11} textAnchor="middle"
            fontSize="8" fill="#4a7fa5" fontFamily="ui-monospace,monospace">
            {lon.toFixed(3)}
          </text>
        ))}

        {/* ── vehicle pins ── */}
        {points.map((p) => {
          const cx = toX(p.lon), cy = toY(p.lat);
          const isHov = hovered === p.vehicleId;
          return (
            <g key={p.vehicleId} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(p.vehicleId)}
              onMouseLeave={() => setHovered(null)}>
              {/* pulse rings */}
              <circle cx={cx} cy={cy} r="14" fill="none" stroke={p.color} strokeWidth="1" opacity="0.25">
                <animate attributeName="r" values="8;20;8" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="10" fill="none" stroke={p.color} strokeWidth="1" opacity="0.18">
                <animate attributeName="r" values="5;14;5" dur="2.4s" begin="0.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2.4s" begin="0.6s" repeatCount="indefinite" />
              </circle>

              {/* pin body — drop-shadow */}
              <filter id={`shadow-${p.vehicleId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={p.color} floodOpacity="0.6" />
              </filter>
              {/* pin shape */}
              <path
                d={`M${cx},${cy - 2}
                    C${cx - 8},${cy - 14} ${cx - 8},${cy - 22} ${cx},${cy - 22}
                    C${cx + 8},${cy - 22} ${cx + 8},${cy - 14} ${cx},${cy - 2}Z`}
                fill={p.color}
                filter={`url(#shadow-${p.vehicleId})`}
                stroke="white" strokeWidth={isHov ? 1.2 : 0.6}
                opacity={isHov ? 1 : 0.92}
              />
              {/* pin hole */}
              <circle cx={cx} cy={cy - 15} r="3" fill="rgba(0,0,0,0.35)" />

              {/* label */}
              <text x={cx} y={cy + 11} textAnchor="middle"
                fontSize={isHov ? 9 : 8} fontWeight="600" fontFamily="system-ui,sans-serif"
                fill={isHov ? p.color : '#94a3b8'}
                style={{ pointerEvents: 'none' }}>
                {p.name}
              </text>
            </g>
          );
        })}

        {/* ── compass rose (top-right) ── */}
        <g transform={`translate(${W - 22}, 22)`}>
          <circle r="12" fill="#0f2035" stroke="#1e3a5f" strokeWidth="1" />
          <text textAnchor="middle" y="-4" fontSize="7" fontWeight="700" fill="#60a5fa" fontFamily="system-ui">N</text>
          <line x1="0" y1="-9" x2="0" y2="0" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#4a7fa5" strokeWidth="1" />
          <line x1="-9" y1="0" x2="9" y2="0" stroke="#4a7fa5" strokeWidth="1" />
        </g>

        {/* ── "GPS LIVE" badge ── */}
        <g transform={`translate(${PAD}, 14)`}>
          <rect x="-2" y="-8" width="62" height="12" rx="4" fill="#0f2035" stroke="#1e3a5f" />
          <circle cx="6" cy="0" r="3" fill="#4ade80">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <text x="13" y="3.5" fontSize="7.5" fontWeight="700" fill="#4ade80" letterSpacing="0.5" fontFamily="system-ui">GPS LIVE</text>
        </g>
      </svg>

      {/* hover tooltip */}
      {hovered && (() => {
        const p = points.find(p => p.vehicleId === hovered);
        return p ? (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(13,27,42,0.92)', border: '1px solid #1e3a5f',
            borderRadius: 8, padding: '7px 12px', fontSize: 11, backdropFilter: 'blur(4px)',
          }}>
            <p style={{ margin: 0, fontWeight: 700, color: p.color }}>{p.name}</p>
            <p style={{ margin: '3px 0 0', color: '#94a3b8', fontFamily: 'ui-monospace,monospace', lineHeight: 1.6 }}>
              Lat: {p.lat.toFixed(5)}<br />Lon: {p.lon.toFixed(5)}
            </p>
          </div>
        ) : null;
      })()}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange]       = useState('24h');
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary]   = useState({ avgSpeed: null, avgTemp: null, totalReadings: null });
  const [top5, setTop5]         = useState([]);
  const [locations, setLocations] = useState([]); // [{ name, vehicleId, data:[{lat,lon,name}] }]
  const [locLoading, setLocLoading] = useState(true);
  const [loading, setLoading]   = useState(true);
  const locInterval = useRef(null);

  /* ── fetch chart + summary data ── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [{ data: vehicles }, { data: top5Data }] = await Promise.all([getVehicles(), getTop5Today()]);
        const { from, to } = getRangeFromTo(range);
        const allReadings = [];
        await Promise.all(vehicles.map(async (v) => {
          try { const { data } = await getReadings(v.vehicleId, from, to); allReadings.push(...data); } catch { /* skip */ }
        }));
        if (cancelled) return;
        setChartData(bucketReadings(allReadings, range));
        // enrich top5 with licensePlate from vehicles list
        const vehicleMap = Object.fromEntries(vehicles.map(v => [v.vehicleId, v]));
        setTop5(top5Data.map(t => ({
          ...t,
          licensePlate: vehicleMap[t.vehicleId]?.licensePlate ?? t.licensePlate ?? '—',
          maxSpeed: t.maxSpeed ?? t.speed ?? t.peakSpeed,
        })));
        const total = allReadings.length;
        setSummary({
          totalReadings: total,
          avgSpeed: total ? +(allReadings.reduce((s, r) => s + r.speed, 0) / total).toFixed(1) : null,
          avgTemp:  total ? +(allReadings.reduce((s, r) => s + r.engineTemp, 0) / total).toFixed(1) : null,
        });
      } catch { /* skip */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [range]);

  /* ── fetch live locations every 10 s ── */
  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data: vehicles } = await getVehicles();
        const series = [];
        await Promise.all(vehicles.map(async (v, i) => {
          try {
            const { data: r } = await getLatestReading(v.vehicleId);
            if (r?.lat != null && r?.lon != null) {
              series.push({
                vehicleId: v.vehicleId,
                name: v.name,
                color: COLORS[i % COLORS.length],
                data: [{ lat: r.lat, lon: r.lon, name: v.name }],
              });
            }
          } catch { /* skip */ }
        }));
        setLocations(series);
      } catch { /* skip */ }
      setLocLoading(false);
    }
    fetchLocations();
    locInterval.current = setInterval(fetchLocations, 10000);
    return () => clearInterval(locInterval.current);
  }, []);

  const ranges = [
    { id: '24h', label: 'Last 24h' },
    { id: '7d',  label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
  ];

  return (
    <div className="analytics-page">

      {/* ── Header ── */}
      <div className="analytics-header">
        <div>
          <h2>Analytics</h2>
          <p>Historical fleet trends</p>
        </div>
        <div className="time-range-toggle">
          {ranges.map(r => (
            <button key={r.id} className={`range-btn${range === r.id ? ' active' : ''}`} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="analytics-stats">
        <StatCard label="Avg Speed"       value={loading ? '…' : summary.avgSpeed}       unit="km/h" color="var(--accent)" />
        <StatCard label="Avg Engine Temp" value={loading ? '…' : summary.avgTemp}        unit="°C"   color="#ef4444" />
        <StatCard label="Total Readings"  value={loading ? '…' : summary.totalReadings}               color="var(--text-h)" />
      </div>

      {/* ── Charts row: Speed + Temp side by side ── */}
      <div className="analytics-row">
        <ChartCard title="Avg Speed over Time" tag="km/h">
          {loading ? empty('Loading…') : chartData.length === 0 ? empty('No data for this period') : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} unit=" km/h" />
                <Tooltip {...tip} formatter={(v) => [`${v} km/h`, 'Avg Speed']} />
                <Line type="monotone" dataKey="Avg Speed" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Avg Engine Temp over Time" tag="°C">
          {loading ? empty('Loading…') : chartData.length === 0 ? empty('No data for this period') : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} unit=" °C" />
                <Tooltip {...tip} formatter={(v) => [`${v} °C`, 'Avg Temp']} />
                <Line type="monotone" dataKey="Avg Temp" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Bottom row: Top 5 table + Location plot ── */}
      <div className="analytics-row analytics-row-bottom">

        {/* Top 5 table */}
        <div className="card" style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="card-head">
            <h3>Top 5 Vehicles by Speed</h3>
            <span className="card-tag">today</span>
          </div>
          {top5.length === 0 ? empty('No data available') : (
            <table className="analytics-table">
              <thead>
                <tr>
                  {['#', 'Vehicle', 'Plate', 'Max Speed'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {top5.map((v, i) => (
                  <tr key={v.vehicleId ?? i}>
                    <td style={{ fontWeight: 700, color: 'var(--text)', width: 28 }}>#{i + 1}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-h)' }}>{v.name ?? v.vehicleName ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)' }}>{v.licensePlate ?? '—'}</td>
                    <td>
                      <span className="analytics-speed-badge">{v.maxSpeed ?? v.speed ?? '—'} km/h</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* GPS map */}
        <div className="card" style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="card-head">
            <h3>Last Known Positions</h3>
            <span style={{ fontSize: 10, color: 'var(--text)' }}>updates every 10s</span>
          </div>
          {locLoading ? empty('Loading…') : <GpsMap locations={locations} />}
        </div>

      </div>
    </div>
  );
}
