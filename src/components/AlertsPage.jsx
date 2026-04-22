import { useEffect, useState } from 'react';
import { getVehicles, getLatestReading, getVehicleSummary } from '../services/api';

const parseTS = ts => ts ? new Date(ts.endsWith('Z') ? ts : ts + 'Z') : null;

export default function AlertsPage() {
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort]             = useState('newest');

  useEffect(() => { loadAlerts(); }, []);

  async function loadAlerts() {
    try {
      const { data: vehicles } = await getVehicles();
      const generated = [];

      for (const v of vehicles) {
        let reading = null;
        let summary = null;
        try { reading = (await getLatestReading(v.vehicleId)).data; } catch { /* skip */ }
        try { summary = (await getVehicleSummary(v.vehicleId)).data; } catch { /* skip */ }

        const minutesAgo = reading ? Math.round((Date.now() - parseTS(reading.timestamp).getTime()) / 60000) : null;

        // Engine overheating
        if (reading && reading.engineTemp > 95) {
          generated.push({
            id: `temp-${v.vehicleId}`,
            severity: reading.engineTemp > 100 ? 'critical' : 'warning',
            vehicle: v.name,
            plate: v.licensePlate,
            alert: 'Engine overheating',
            value: `${reading.engineTemp.toFixed(0)}°C`,
            threshold: `Threshold: ±100°C`,
            time: minutesAgo,
            status: minutesAgo < 10 ? 'active' : 'resolved',
            ts: reading.timestamp,
          });
        // High engine temp (between 90-95)
        } else if (reading && reading.engineTemp > 90) {
          generated.push({
            id: `hightemp-${v.vehicleId}`,
            severity: 'info',
            vehicle: v.name,
            plate: v.licensePlate,
            alert: 'High engine temp',
            value: `${reading.engineTemp.toFixed(0)}°C`,
            threshold: `Threshold: ±90°C`,
            time: minutesAgo,
            status: minutesAgo < 30 ? 'active' : 'resolved',
            ts: reading.timestamp,
          });
        }

        // Overspeed
        if (reading && reading.speed > 100) {
          generated.push({
            id: `speed-${v.vehicleId}`,
            severity: reading.speed > 115 ? 'critical' : 'warning',
            vehicle: v.name,
            plate: v.licensePlate,
            alert: 'Overspeed',
            value: `${reading.speed.toFixed(0)} km/h`,
            threshold: `Threshold: 100 km/h`,
            time: minutesAgo,
            status: minutesAgo < 10 ? 'active' : 'resolved',
            ts: reading.timestamp,
          });
        }

        // Vehicle offline
        if (minutesAgo !== null && minutesAgo > 15) {
          generated.push({
            id: `offline-${v.vehicleId}`,
            severity: minutesAgo > 60 ? 'warning' : 'info',
            vehicle: v.name,
            plate: v.licensePlate,
            alert: 'Vehicle offline',
            value: `${minutesAgo} min`,
            threshold: `Threshold: 15 min`,
            time: minutesAgo,
            status: 'active',
            ts: reading?.timestamp,
          });
        }

        // Low GPS accuracy (simulate for some vehicles)
        if (reading && reading.lat && summary && summary.totalReadings < 50) {
          generated.push({
            id: `gps-${v.vehicleId}`,
            severity: 'info',
            vehicle: v.name,
            plate: v.licensePlate,
            alert: 'Low GPS accuracy',
            value: `±42m`,
            threshold: `Threshold: ±25m`,
            time: minutesAgo,
            status: 'resolved',
            ts: reading.timestamp,
          });
        }
      }

      // Simulate some acknowledged alerts
      generated.forEach((a, i) => {
        if (a.status === 'resolved' && i % 3 === 0) a.status = 'acknowledged';
      });

      setAlerts(generated);
    } catch (err) {
      console.error('Alerts load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAcknowledge(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  }

  function handleReopen(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
  }

  // Compute stats
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const ackedCount  = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
  const totalCount  = alerts.length;

  // Apply filters
  let filtered = [...alerts];
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
  if (typeFilter !== 'all')   filtered = filtered.filter(a => a.severity === typeFilter);

  // Sort
  if (sort === 'newest') filtered.sort((a, b) => (a.time || 0) - (b.time || 0));
  else filtered.sort((a, b) => (b.time || 0) - (a.time || 0));

  if (loading) return <div className="dash-loading">Loading alerts...</div>;

  return (
    <div className="alerts-page">
      {/* Header */}
      <div className="alerts-header">
        <div>
          <h2>Alerts</h2>
          <p className="alerts-subtitle">All triggered alerts across the fleet</p>
        </div>
        <button className="alerts-config-btn">
          Configure rules <span>&#x2197;</span>
        </button>
      </div>

      {/* Stat strip */}
      <div className="stat-strip">
        <div className="stat-card">
          <p className="stat-label">Active now</p>
          <p className="stat-value" style={{ color: '#ef4444' }}>{activeCount}</p>
          <p className="stat-sub">unacknowledged</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Acknowledged</p>
          <p className="stat-value" style={{ color: '#f59e0b' }}>{ackedCount}</p>
          <p className="stat-sub">pending review</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resolved today</p>
          <p className="stat-value" style={{ color: '#22c55e' }}>{resolvedCount}</p>
          <p className="stat-sub">auto + manual</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total this week</p>
          <p className="stat-value" style={{ color: 'var(--text-h)' }}>{totalCount}</p>
          <p className="stat-sub">across {new Set(alerts.map(a => a.vehicle)).size} vehicles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="alerts-filters">
        <div className="alerts-filter-group">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'acknowledged', label: 'Acknowledged' },
            { key: 'resolved', label: 'Resolved' },
          ].map(f => (
            <button key={f.key}
              className={`alert-filter-chip${statusFilter === f.key ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </button>
          ))}

          <span className="filter-divider" />

          {[
            { key: 'all', label: 'All types' },
            { key: 'critical', label: 'Critical' },
            { key: 'warning', label: 'Warning' },
            { key: 'info', label: 'Info' },
          ].map(f => (
            <button key={f.key}
              className={`alert-filter-chip type-chip${typeFilter === f.key ? ' active' : ''}`}
              onClick={() => setTypeFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <select className="alerts-sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Table */}
      <div className="alerts-table-wrap">
        <table className="alerts-table">
          <thead>
            <tr>
              <th className="col-check"><input type="checkbox" /></th>
              <th>Severity</th>
              <th>Vehicle</th>
              <th>Alert</th>
              <th>Value</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="alerts-empty">No alerts match the current filters</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className={`alerts-row severity-${a.severity}`}>
                <td className="col-check"><input type="checkbox" /></td>
                <td>
                  <span className={`severity-badge sev-${a.severity}`}>{a.severity}</span>
                </td>
                <td>
                  <span className="alert-vehicle-name">{a.vehicle}</span>
                  <span className="alert-vehicle-plate">{a.plate}</span>
                </td>
                <td className="alert-type-cell">{a.alert}</td>
                <td>
                  <span className="alert-value-main">{a.value}</span>
                  <span className="alert-value-threshold">{a.threshold}</span>
                </td>
                <td className="alert-time-cell">{formatTime(a.time)}</td>
                <td>
                  <span className={`alert-status-badge st-${a.status}`}>
                    {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                </td>
                <td className="alert-actions-cell">
                  {a.status === 'active' && (
                    <>
                      <button className="alert-action-btn primary" onClick={() => handleAcknowledge(a.id)}>Acknowledge</button>
                      <button className="alert-action-btn">Details</button>
                    </>
                  )}
                  {a.status === 'acknowledged' && (
                    <>
                      <button className="alert-action-btn">Acknowledge</button>
                      <button className="alert-action-btn">Details</button>
                    </>
                  )}
                  {a.status === 'resolved' && (
                    <button className="alert-action-btn" onClick={() => handleReopen(a.id)}>Re-open</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTime(mins) {
  if (mins === null || mins === undefined) return '—';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ago`;
}
