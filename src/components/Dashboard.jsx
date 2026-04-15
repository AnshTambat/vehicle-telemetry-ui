import { useEffect, useState } from 'react';
import {
  getVehicles, getLatestReading, getVehicleSummary,
  getTop5Today, getReadings
} from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

export default function Dashboard() {
  const [vehicles, setVehicles]     = useState([]);
  const [stats, setStats]           = useState({ active: 0, total: 0, readings: 0, peakSpeed: 0, peakVehicle: '', alerts: 0, criticalAlerts: 0 });
  const [alerts, setAlerts]         = useState([]);
  const [top5, setTop5]             = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [summaries, setSummaries]   = useState({});
  const [timeRange, setTimeRange]   = useState('today');

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const { data: vehs } = await getVehicles();

      // Enrich each vehicle with latest reading
      const enriched = await Promise.all(vehs.map(async v => {
        try {
          const { data: r } = await getLatestReading(v.vehicleId);
          const minutesAgo = (Date.now() - new Date(r.timestamp).getTime()) / 60000;
          let status = 'online';
          if (minutesAgo > 15) status = 'offline';
          else if (r.speed > 100 || r.engineTemp > 100) status = 'warning';
          return { ...v, speed: r.speed, engineTemp: r.engineTemp, lastSeen: r.timestamp, status, lat: r.lat, lon: r.lon };
        } catch {
          return { ...v, speed: null, engineTemp: null, lastSeen: null, status: 'offline', lat: null, lon: null };
        }
      }));

      setVehicles(enriched);

      // Compute stats
      const activeCount = enriched.filter(v => v.status !== 'offline').length;
      let totalReadings = 0;
      let peakSpeed = 0;
      let peakVehicle = '';
      const generatedAlerts = [];

      for (const v of enriched) {
        try {
          const { data: summary } = await getVehicleSummary(v.vehicleId);
          totalReadings += summary.totalReadings || 0;
          if (summary.maxSpeed > peakSpeed) { peakSpeed = summary.maxSpeed; peakVehicle = v.name; }
        } catch { /* skip */ }

        if (v.engineTemp !== null && v.engineTemp > 100) {
          generatedAlerts.push({ id: `temp-${v.vehicleId}`, type: 'critical', icon: 'temp',
            message: `Engine temp critical — ${v.name} (${v.engineTemp.toFixed(0)}°C)`,
            time: timeSince(v.lastSeen) });
        }
        if (v.speed !== null && v.speed > 100) {
          generatedAlerts.push({ id: `speed-${v.vehicleId}`, type: 'warning', icon: 'speed',
            message: `Overspeed detected — ${v.name} (${v.speed.toFixed(0)} km/h)`,
            time: timeSince(v.lastSeen) });
        }
        if (v.status === 'offline') {
          const mins = v.lastSeen ? Math.round((Date.now() - new Date(v.lastSeen).getTime()) / 60000) : null;
          generatedAlerts.push({ id: `offline-${v.vehicleId}`, type: 'info', icon: 'offline',
            message: `${v.name} offline${mins ? ` — no readings for ${mins} min` : ''}`,
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

      // Top 5 speed — try the dedicated endpoint first, fall back to summaries
      try {
        const { data: t5 } = await getTop5Today();
        if (Array.isArray(t5) && t5.length > 0) {
          setTop5(t5.slice(0, 5));
        } else {
          // Fallback: build top 5 from the summaries we already fetched
          const ranked = enriched
            .filter(v => v.speed !== null)
            .map(v => ({ vehicleName: v.name, maxSpeed: v.speed }))
            .sort((a, b) => b.maxSpeed - a.maxSpeed)
            .slice(0, 5);
          setTop5(ranked);
        }
      } catch {
        const ranked = enriched
          .filter(v => v.speed !== null)
          .map(v => ({ vehicleName: v.name, maxSpeed: v.speed }))
          .sort((a, b) => b.maxSpeed - a.maxSpeed)
          .slice(0, 5);
        setTop5(ranked);
      }

      // Build hourly readings count from all vehicles
      buildHourlyData(enriched);

    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function buildHourlyData(vehs) {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}:00`, count: 0 }));
    for (const v of vehs) {
      try {
        // Fetch all available readings (no date filter) so the chart works even with older data
        const { data: readings } = await getReadings(v.vehicleId);
        readings.forEach(r => {
          const h = new Date(r.timestamp).getHours();
          hours[h].count++;
        });
      } catch { /* skip */ }
    }
    setHourlyData(hours);
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

  if (loading) return <div className="dash-loading">Loading dashboard...</div>;

  const currentHour = new Date().getHours();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2>Dashboard</h2>
          <p className="dash-date">{dateStr} &middot; Chennai fleet</p>
        </div>
        <div className="time-range-toggle">
          {['today', 'week', 'month'].map(r => (
            <button key={r} className={`range-btn${timeRange === r ? ' active' : ''}`}
              onClick={() => setTimeRange(r)}>
              {r === 'today' ? 'Today' : r === 'week' ? 'This week' : 'This month'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat strip */}
      <div className="stat-strip">
        <StatCard label="Active vehicles" value={stats.active} sub={`of ${stats.total} total`} color="var(--accent)" />
        <StatCard label="Total readings today" value={stats.readings.toLocaleString()} sub="last 24 h" color="#6366f1" />
        <StatCard label="Peak speed today" value={`${stats.peakSpeed} km/h`} sub={stats.peakVehicle} color="#f59e0b" />
        <StatCard label="Active alerts" value={stats.alerts} sub={`${stats.criticalAlerts} critical`} color="#ef4444" />
      </div>

      {/* Row: Fleet status + Active alerts */}
      <div className="dash-row">
        <div className="card dash-card-fleet">
          <div className="card-head">
            <h3>Fleet status</h3>
            <button className="card-link">Manage fleet &#x2197;</button>
          </div>
          <div className="fleet-list">
            {vehicles.map(v => (
              <div key={v.vehicleId}>
                <div className="fleet-row" onClick={() => toggleExpand(v.vehicleId)}>
                  <div className="fleet-vehicle-info">
                    <span className="fleet-name">{v.name}</span>
                    <span className="fleet-plate">{v.licensePlate}</span>
                  </div>
                  <div className="fleet-stats">
                    <span className="fleet-speed">{v.speed !== null ? `${v.speed.toFixed(0)} km/h` : '— km/h'}</span>
                    <span className="fleet-temp">{v.engineTemp !== null ? `${v.engineTemp.toFixed(0)}°C` : '—°C'}</span>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                {expandedId === v.vehicleId && (
                  <div className="fleet-expanded">
                    {summaries[v.vehicleId] ? (
                      <div className="fleet-summary-grid">
                        <div><span className="summary-label">Avg Speed</span><span className="summary-val">{summaries[v.vehicleId].avgSpeed?.toFixed(1)} km/h</span></div>
                        <div><span className="summary-label">Max Speed</span><span className="summary-val">{summaries[v.vehicleId].maxSpeed?.toFixed(1)} km/h</span></div>
                        <div><span className="summary-label">Avg Temp</span><span className="summary-val">{summaries[v.vehicleId].avgEngineTemp?.toFixed(1)}°C</span></div>
                        <div><span className="summary-label">Readings</span><span className="summary-val">{summaries[v.vehicleId].totalReadings}</span></div>
                      </div>
                    ) : <p className="fleet-summary-loading">Loading summary...</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card dash-card-alerts">
          <div className="card-head">
            <h3>Active alerts</h3>
            <button className="card-link">View all &#x2197;</button>
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
      </div>

      {/* Row: Top 5 speed + Readings per hour */}
      <div className="dash-row">
        <div className="card dash-card-half">
          <div className="card-head">
            <h3>Top 5 by peak speed today</h3>
            <button className="card-link">Full analytics &#x2197;</button>
          </div>
          {top5.length > 0 ? (
            <div className="top5-bars">
              {top5.map((v, i) => (
                <div key={i} className="top5-row">
                  <span className="top5-name">{v.vehicleName || v.name || `Vehicle ${i + 1}`}</span>
                  <div className="top5-bar-track">
                    <div className="top5-bar-fill" style={{ width: `${Math.min(100, ((v.maxSpeed || v.peakSpeed || 0) / Math.max(...top5.map(t => t.maxSpeed || t.peakSpeed || 1))) * 100)}%` }} />
                  </div>
                  <span className="top5-val">{(v.maxSpeed || v.peakSpeed || 0).toFixed(0)}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text)', fontSize: 13 }}>No data available</p>}
        </div>

        <div className="card dash-card-half">
          <div className="card-head">
            <h3>Readings per hour (today)</h3>
            <button className="card-link">View trend &#x2197;</button>
          </div>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val) => [`${val} readings`, 'Count']}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, i) => (
                    <Cell key={i} fill={i >= currentHour - 2 && i <= currentHour ? '#2563eb' : '#d1d5db'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text)', fontSize: 13 }}>No data available</p>}
        </div>
      </div>

      {/* Map preview */}
      <div className="card dash-card-map">
        <div className="card-head">
          <h3>Last known positions</h3>
        </div>
        
        <div className="map-coords">
          {vehicles.map(v => (
            <span key={v.vehicleId} className="coord-tag">
              {v.name}: {v.lat ? `${parseFloat(v.lat).toFixed(4)}°N ${parseFloat(v.lon).toFixed(4)}°E` : 'no position'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Small sub-components ── */

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
      <p className="stat-sub">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    online:  { label: 'Online',  cls: 'badge-online' },
    warning: { label: 'Warning', cls: 'badge-warning' },
    offline: { label: 'Offline', cls: 'badge-offline' },
  };
  const b = map[status] || map.offline;
  return <span className={`status-badge ${b.cls}`}>{b.label}</span>;
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
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}
