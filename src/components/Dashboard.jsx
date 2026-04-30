import { useEffect, useState, useRef } from 'react';
import {
  getVehicles, getLatestReading, getVehicleSummary,
  getTop5Today, getReadings
} from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts';

const LINE_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b'];
const GPS_COLORS  = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444'];
const REFRESH_SEC = 15;

// SQL Server → EF Core strips the UTC Kind → JSON has no "Z" suffix
// → JS treats timestamp as local time (IST = UTC+5:30) → minutesAgo inflated by 330 min
// → all vehicles falsely show offline. Appending "Z" forces UTC parsing.
const parseTS = ts => ts ? new Date(ts.endsWith('Z') ? ts : ts + 'Z') : null;

export default function Dashboard() {
  const [vehicles, setVehicles]       = useState([]);
  const [stats, setStats]             = useState({ active: 0, total: 0, readings: 0, peakSpeed: 0, peakVehicle: '', alerts: 0, criticalAlerts: 0 });
  const [alerts, setAlerts]           = useState([]);
  const [top5, setTop5]               = useState([]);
  const [hourlyData, setHourlyData]   = useState([]);
  const [trendData, setTrendData]     = useState({ points: [], vehicleNames: [] });
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);
  const [summaries, setSummaries]     = useState({});
  const [countdown, setCountdown]     = useState(REFRESH_SEC);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refreshRef   = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    loadDashboard();

    refreshRef.current = setInterval(() => {
      loadDashboard();
      setCountdown(REFRESH_SEC);
    }, REFRESH_SEC * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_SEC : c - 1));
    }, 1000);

    return () => {
      clearInterval(refreshRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  async function loadDashboard() {
    try {
      const { data: vehs } = await getVehicles();

      const enriched = await Promise.all(vehs.map(async v => {
        try {
          const { data: r } = await getLatestReading(v.vehicleId);
          const minutesAgo = (Date.now() - parseTS(r.timestamp).getTime()) / 60000;
          let status = 'online';
          if (minutesAgo > 15) status = 'offline';
          else if (r.speed > 100 || r.engineTemp > 100) status = 'warning';
          return { ...v, speed: r.speed, engineTemp: r.engineTemp, lastSeen: r.timestamp, status, lat: r.lat, lon: r.lon };
        } catch {
          return { ...v, speed: null, engineTemp: null, lastSeen: null, status: 'offline', lat: null, lon: null };
        }
      }));

      setVehicles(enriched);
      setLastUpdated(new Date());

      const activeCount = enriched.filter(v => v.status !== 'offline').length;
      let totalReadings = 0, peakSpeed = 0, peakVehicle = '';
      const generatedAlerts = [];

      for (const v of enriched) {
        try {
          const { data: summary } = await getVehicleSummary(v.vehicleId);
          totalReadings += summary.totalReadings || 0;
          if ((summary.peakSpeed || 0) > peakSpeed) {
            peakSpeed = summary.peakSpeed;
            peakVehicle = v.name;
          }
        } catch { /* skip */ }

        if (v.engineTemp !== null && v.engineTemp > 100) {
          generatedAlerts.push({ id: `temp-${v.vehicleId}`, type: 'critical', icon: 'temp',
            message: `Engine temp critical — ${v.name} (${v.engineTemp.toFixed(0)}°C)`,
            time: timeSince(v.lastSeen) });
        }
        if (v.speed !== null && v.speed > 100) {
          generatedAlerts.push({ id: `speed-${v.vehicleId}`, type: 'warning', icon: 'speed',
            message: `Overspeed — ${v.name} (${v.speed.toFixed(0)} km/h)`,
            time: timeSince(v.lastSeen) });
        }
        if (v.status === 'offline') {
          const mins = v.lastSeen ? Math.round((Date.now() - new Date(v.lastSeen).getTime()) / 60000) : null;
          generatedAlerts.push({ id: `offline-${v.vehicleId}`, type: 'info', icon: 'offline',
            message: `${v.name} offline${mins ? ` — ${mins} min` : ''}`,
            time: mins ? `${mins} min ago` : '' });
        }
      }

      setAlerts(generatedAlerts.slice(0, 3));
      setStats({
        active: activeCount, total: enriched.length,
        readings: totalReadings, peakSpeed: Math.round(peakSpeed),
        peakVehicle, alerts: generatedAlerts.length,
        criticalAlerts: generatedAlerts.filter(a => a.type === 'critical').length
      });

      try {
        const { data: t5 } = await getTop5Today();
        if (Array.isArray(t5) && t5.length > 0) {
          setTop5(t5.slice(0, 5));
        } else {
          setTop5(enriched.filter(v => v.speed !== null)
            .map(v => ({ vehicleName: v.name, maxSpeed: v.speed }))
            .sort((a, b) => b.maxSpeed - a.maxSpeed).slice(0, 5));
        }
      } catch {
        setTop5(enriched.filter(v => v.speed !== null)
          .map(v => ({ vehicleName: v.name, maxSpeed: v.speed }))
          .sort((a, b) => b.maxSpeed - a.maxSpeed).slice(0, 5));
      }

      buildReadingsData(enriched);

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function buildReadingsData(vehs) {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}:00`, count: 0 }));

    const vehicleReadings = await Promise.all(
      vehs.map(async (v) => {
        try {
          const { data } = await getReadings(v.vehicleId, from);
          data.forEach(r => { hours[new Date(r.timestamp).getHours()].count++; });
          const recent = [...data]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(-20);
          return { name: v.name, readings: recent };
        } catch {
          return { name: v.name, readings: [] };
        }
      })
    );

    setHourlyData(hours);

    // Build speed trend chart
    const longest = vehicleReadings.reduce((a, b) => a.readings.length > b.readings.length ? a : b, { readings: [] });
    if (longest.readings.length > 0) {
      const points = longest.readings.map((ref, i) => {
        const time = new Date(ref.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        const point = { time };
        vehicleReadings.forEach(vr => {
          if (vr.readings[i]) point[vr.name] = parseFloat(vr.readings[i].speed?.toFixed(1));
        });
        return point;
      });
      setTrendData({ points, vehicleNames: vehicleReadings.map(v => v.name) });
    }
  }

  async function toggleExpand(vehicleId) {
    if (expandedId === vehicleId) { setExpandedId(null); return; }
    setExpandedId(vehicleId);
    if (!summaries[vehicleId]) {
      try {
        const { data } = await getVehicleSummary(vehicleId);
        setSummaries(prev => ({ ...prev, [vehicleId]: data }));
      } catch {
        setSummaries(prev => ({ ...prev, [vehicleId]: null }));
      }
    }
  }

  if (loading) return (
    <div className="dash-loading">
      <div className="loading-ring"></div>
      <p>Loading live dashboard…</p>
    </div>
  );

  const currentHour = new Date().getHours();
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const updatedStr = lastUpdated?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <div className="dash-title-row">
            <h2>Dashboard</h2>
            <span className="live-badge"><span className="live-dot"></span>LIVE</span>
          </div>
          <p className="dash-date">
            {dateStr} &middot; Chennai fleet
            &middot; Refreshes in <strong>{countdown}s</strong>
            {lastUpdated && <> &middot; updated {updatedStr}</>}
          </p>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="stat-strip stat-strip-3">
        <StatCard label="Active vehicles"  value={stats.active}             sub={`of ${stats.total} total`}          color="#2563eb" icon="vehicles" />
        <StatCard label="Peak speed today" value={`${stats.peakSpeed} km/h`} sub={stats.peakVehicle}                color="#f59e0b" icon="speed"    />
        <StatCard label="Active alerts"    value={stats.alerts}             sub={`${stats.criticalAlerts} critical`} color="#ef4444" icon="alert"    />
      </div>

      {/* ── Feature 1: Engine Temp Gauges ── */}
      <div className="card dash-gauges-card">
        <div className="card-head">
          <h3>Engine Temperature</h3>
          <span className="card-tag">Live · Auto-updates</span>
        </div>
        <div className="gauges-row">
          {vehicles.map(v => (
            <TempGauge key={v.vehicleId} name={v.name} temp={v.engineTemp} status={v.status} />
          ))}
        </div>
        <div className="gauge-legend">
          <span className="gl-item gl-normal">Normal  &lt;87°C</span>
          <span className="gl-item gl-warn">Warning  87–100°C</span>
          <span className="gl-item gl-crit">Critical  &gt;100°C</span>
        </div>
      </div>

      {/* ── Feature 2: Speed Trend Line Chart ── */}
      {trendData.points.length > 0 && (
        <div className="card dash-trend-card">
          <div className="card-head">
            <h3>Speed Trend</h3>
            <span className="card-tag">Last 20 readings per vehicle · km/h</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trendData.points} margin={{ top: 8, right: 20, bottom: 0, left: -10 }}>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} unit=" km/h" domain={[0, 'auto']} width={60} />
              <Tooltip
                formatter={(val, name) => [`${val} km/h`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {trendData.vehicleNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Row A: Fleet | Alerts | GPS (equal 3 cols) ── */}
      <div className="dash-row-main">

        {/* Fleet status */}
        <div className="card">
          <div className="card-head"><h3>Fleet status</h3></div>
          <div className="fleet-list">
            {vehicles.map(v => (
              <div key={v.vehicleId}>
                <div className="fleet-row" onClick={() => toggleExpand(v.vehicleId)}>
                  <div className="fleet-vehicle-info">
                    <span className="fleet-name">{v.name}</span>
                    <span className="fleet-plate">{v.licensePlate}</span>
                  </div>
                  <div className="fleet-stats">
                    <span className="fleet-speed">{v.speed !== null ? `${v.speed.toFixed(0)} km/h` : '—'}</span>
                    <span className="fleet-temp">{v.engineTemp !== null ? `${v.engineTemp.toFixed(0)}°C` : '—'}</span>
                  </div>
                  <PulseBadge status={v.status} />
                </div>
                {expandedId === v.vehicleId && (
                  <div className="fleet-expanded">
                    {summaries[v.vehicleId] ? (
                      <div className="fleet-summary-grid">
                        <div><span className="summary-label">Peak Speed</span><span className="summary-val">{summaries[v.vehicleId].peakSpeed?.toFixed(1)} km/h</span></div>
                        <div><span className="summary-label">Avg Temp</span><span className="summary-val">{summaries[v.vehicleId].avgEngineTemp?.toFixed(1)}°C</span></div>
                        <div><span className="summary-label">Readings</span><span className="summary-val">{summaries[v.vehicleId].totalReadings}</span></div>
                        <div><span className="summary-label">Last seen</span><span className="summary-val">{timeSince(summaries[v.vehicleId].lastSeen)}</span></div>
                      </div>
                    ) : <p className="fleet-summary-loading">Loading…</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active alerts */}
        <div className="card">
          <div className="card-head">
            <h3>Active alerts</h3>
            <span className="card-tag">{stats.alerts} total</span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 && <p className="no-alerts">No active alerts</p>}
            {alerts.map(a => (
              <div key={a.id} className={`alert-item alert-${a.type}`}>
                <AlertIcon type={a.icon} />
                <div className="alert-body">
                  <p className="alert-msg">{a.message}</p>
                  <p className="alert-time">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GPS positions */}
        <div className="card gps-card">
          <div className="card-head">
            <h3>Last known positions</h3>
            <span className="card-tag">Chennai fleet</span>
          </div>
          <div className="gps-list">
            {vehicles.map((v, i) => (
              <div key={v.vehicleId} className="gps-item" style={{ '--gps-clr': GPS_COLORS[i % GPS_COLORS.length] }}>
                <div className="gps-pin-col">
                  <span className={`gps-pulse-dot ${v.status === 'offline' ? 'gps-dot-off' : 'gps-dot-on'}`} />
                  <div className="gps-pin-line" />
                </div>
                <div className="gps-content">
                  <div className="gps-top-row">
                    <span className="gps-name">{v.name}</span>
                    <span className="gps-plate-chip">{v.licensePlate}</span>
                  </div>
                  {v.lat ? (
                    <div className="gps-coord-row">
                      <span className="gps-coord-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                        {parseFloat(v.lat).toFixed(4)}°N
                      </span>
                      <span className="gps-coord-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                        {parseFloat(v.lon).toFixed(4)}°E
                      </span>
                    </div>
                  ) : (
                    <span className="gps-offline">● No signal</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row B: Hourly bar (wide) | Top 5 ── */}
      <div className="dash-row-bottom">
        <div className="card">
          <div className="card-head">
            <h3>Readings per hour</h3>
            <span className="card-tag">Today</span>
          </div>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val) => [`${val} readings`, 'Count']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((_, i) => (
                    <Cell key={i}
                      fill={i === currentHour ? '#2563eb' : i < currentHour ? '#93c5fd' : 'var(--bar-track)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text)', fontSize: 13 }}>No data yet</p>}
        </div>

        {/* Top 5 peak speed */}
        <div className="card">
          <div className="card-head">
            <h3>Top 5 peak speed</h3>
            <span className="card-tag">Today</span>
          </div>
          {top5.length > 0 ? (
            <div className="top5-bars">
              {top5.map((v, i) => {
                const spd = v.maxSpeed || v.peakSpeed || 0;
                const maxSpd = Math.max(...top5.map(t => t.maxSpeed || t.peakSpeed || 1));
                return (
                  <div key={i} className="top5-row">
                    <span className="top5-rank">#{i + 1}</span>
                    <span className="top5-name">{v.vehicleName || v.name || `V${i + 1}`}</span>
                    <div className="top5-bar-track">
                      <div className="top5-bar-fill" style={{ width: `${Math.min(100, (spd / maxSpd) * 100)}%` }} />
                    </div>
                    <span className="top5-val">{spd.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: 'var(--text)', fontSize: 13 }}>No data yet</p>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Sub-components
══════════════════════════════════════ */

const STAT_IMAGES = {
  vehicles: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=200&fit=crop&auto=format',
  speed:    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=200&fit=crop&auto=format',
  alert:    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=200&fit=crop&auto=format',
};

const STAT_ICONS = {
  vehicles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="32" height="32">
      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  speed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="32" height="32">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="32" height="32">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card" style={{
      '--sc-accent': color,
      backgroundImage: `url(${STAT_IMAGES[icon]})`,
    }}>
      {/* dark overlay so text stays readable */}
      <div className="stat-card-overlay" />
      <div className="stat-card-top">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="stat-label">{label}</p>
          <p className="stat-value" style={{ color }}>{value}</p>
          <p className="stat-sub">{sub}</p>
        </div>
        <div className="stat-icon" style={{ color, position: 'relative', zIndex: 1 }}>
          {STAT_ICONS[icon]}
        </div>
      </div>
      <div className="stat-card-bar" style={{ background: color }} />
    </div>
  );
}

/* Feature 4 — Pulsing status badge */
function PulseBadge({ status }) {
  const cfg = {
    online:  { label: 'Online',  dot: 'pdot-online',  cls: 'badge-online' },
    warning: { label: 'Warning', dot: 'pdot-warning', cls: 'badge-warning' },
    offline: { label: 'Offline', dot: 'pdot-offline', cls: 'badge-offline' },
  };
  const b = cfg[status] || cfg.offline;
  return (
    <span className={`pulse-badge ${b.cls}`}>
      <span className={`pdot ${b.dot}`}></span>
      {b.label}
    </span>
  );
}

/* Feature 3 — SVG radial temperature gauge */
function TempGauge({ name, temp, status }) {
  const MIN = 60, MAX = 120;
  const r = 42, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const arc  = circ * 0.75;                                       // 270° sweep
  const t = temp ?? 0;
  const progress = Math.max(0, Math.min(1, (t - MIN) / (MAX - MIN)));
  const fill  = arc * progress;
  const color = t > 100 ? '#ef4444' : t > 87 ? '#f59e0b' : '#22c55e';
  const sub   = t > 100 ? 'Critical' : t > 87 ? 'Warning' : 'Normal';

  return (
    <div className="gauge-wrap">
      <svg width="120" height="112" viewBox="0 0 120 112">
        {/* Track arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--bar-track)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          transform={`rotate(135 ${cx} ${cy})`} />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.7s ease, stroke 0.4s ease' }} />
        {/* Centre text */}
        {temp !== null ? (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle"
              fontSize="20" fontWeight="700" fill={color} fontFamily="system-ui">
              {Math.round(t)}°C
            </text>
            <text x={cx} y={cy + 17} textAnchor="middle"
              fontSize="10" fill="#9ca3af" fontFamily="system-ui">
              {sub}
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 4} textAnchor="middle" dominantBaseline="middle"
            fontSize="12" fill="#9ca3af" fontFamily="system-ui">offline</text>
        )}
      </svg>
      <p className="gauge-name">{name}</p>
      <span className={`gauge-status-dot pdot ${
        status === 'online'  ? 'pdot-online'  :
        status === 'warning' ? 'pdot-warning' : 'pdot-offline'}`}
      />
    </div>
  );
}

function AlertIcon({ type }) {
  if (type === 'temp') return (
    <span className="alert-icon alert-icon-critical">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
      </svg>
    </span>
  );
  if (type === 'speed') return (
    <span className="alert-icon alert-icon-warning">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
  return (
    <span className="alert-icon alert-icon-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
}

function timeSince(ts) {
  if (!ts) return '';
  const mins = Math.round((Date.now() - parseTS(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}
