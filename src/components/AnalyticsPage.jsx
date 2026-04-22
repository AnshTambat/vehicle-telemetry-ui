import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getVehicles, getReadings, getTop5Today } from '../services/api';

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 22px',
      flex: 1,
      minWidth: 140,
    }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700, color: color || 'var(--text-h)' }}>
        {value ?? '—'}<span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4, color: 'var(--text)' }}>{unit}</span>
      </p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 22px',
      flex: 1,
      minWidth: 0,
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{title}</h3>
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

  const fmt = (d) => {
    if (range === '24h') return `${d.getHours()}:00`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

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
    .sort((a, b) => Number(a.label.split(':')[0] || a.label) - Number(b.label.split(':')[0] || b.label))
    .map(b => ({
      label: b.label,
      'Avg Speed': +(b.speeds.reduce((s, v) => s + v, 0) / b.speeds.length).toFixed(1),
      'Avg Temp': +(b.temps.reduce((s, v) => s + v, 0) / b.temps.length).toFixed(1),
    }));
}

const empty = (text) => (
  <p style={{ color: 'var(--text)', textAlign: 'center', padding: '40px 0', margin: 0 }}>{text}</p>
);

export default function AnalyticsPage() {
  const [range, setRange] = useState('24h');
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({ avgSpeed: null, avgTemp: null, totalReadings: null });
  const [top5, setTop5] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [{ data: vehicles }, { data: top5Data }] = await Promise.all([
          getVehicles(),
          getTop5Today(),
        ]);

        const { from, to } = getRangeFromTo(range);
        const allReadings = [];
        await Promise.all(
          vehicles.map(async (v) => {
            try {
              const { data } = await getReadings(v.vehicleId, from, to);
              allReadings.push(...data);
            } catch { /* skip */ }
          })
        );

        if (cancelled) return;

        setChartData(bucketReadings(allReadings, range));
        setTop5(top5Data);

        const total = allReadings.length;
        setSummary({
          totalReadings: total,
          avgSpeed: total ? +(allReadings.reduce((s, r) => s + r.speed, 0) / total).toFixed(1) : null,
          avgTemp:  total ? +(allReadings.reduce((s, r) => s + r.engineTemp, 0) / total).toFixed(1) : null,
        });
      } catch { /* skip */ }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [range]);

  const ranges = [
    { id: '24h', label: 'Last 24h' },
    { id: '7d',  label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
  ];

  const tooltipStyle = {
    contentStyle: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 },
  };

  return (
    <div style={{ padding: '28px 32px', width: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>Analytics</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>Historical fleet trends</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {ranges.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: range === r.id ? 'var(--accent)' : 'var(--border)',
                background: range === r.id ? 'var(--accent-bg)' : 'transparent',
                color: range === r.id ? 'var(--accent)' : 'var(--text)',
                fontWeight: range === r.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Avg Speed"        value={loading ? '…' : summary.avgSpeed}       unit="km/h" color="var(--accent)" />
        <StatCard label="Avg Engine Temp"  value={loading ? '…' : summary.avgTemp}        unit="°C"   color="#dc2626" />
        <StatCard label="Total Readings"   value={loading ? '…' : summary.totalReadings} />
      </div>

      {/* Charts — stacked vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
        <ChartCard title="Avg Speed over Time (km/h)">
          {loading ? empty('Loading…') : chartData.length === 0 ? empty('No data for this period') : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} unit=" km/h" />
                <Tooltip {...tooltipStyle} formatter={(val) => [`${val} km/h`, 'Avg Speed']} />
                <Line type="monotone" dataKey="Avg Speed" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Avg Engine Temp over Time (°C)">
          {loading ? empty('Loading…') : chartData.length === 0 ? empty('No data for this period') : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text)' }} unit=" °C" />
                <Tooltip {...tooltipStyle} formatter={(val) => [`${val} °C`, 'Avg Temp']} />
                <Line type="monotone" dataKey="Avg Temp" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top 5 Vehicles by Speed Today */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 22px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>
          Top 5 Vehicles by Speed Today
        </h3>
        {top5.length === 0 ? empty('No data available') : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Rank', 'Vehicle', 'License Plate', 'Max Speed'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top5.map((v, i) => (
                <tr key={v.vehicleId ?? i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 700 }}>#{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-h)', fontWeight: 500 }}>{v.name ?? v.vehicleName ?? '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{v.licensePlate ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      borderRadius: 6,
                      padding: '2px 10px',
                      fontWeight: 600,
                    }}>
                      {v.maxSpeed ?? v.speed ?? '—'} km/h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
