export default function MapLite({ readings }) {
  if (!readings?.length) 
    return <p style={{ color: '#888' }}>No GPS data available.</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f0f4ff' }}>
          <th style={th}>#</th>
          <th style={th}>Latitude</th>
          <th style={th}>Longitude</th>
          <th style={th}>Speed (km/h)</th>
          <th style={th}>Engine Temp (°C)</th>
          <th style={th}>Time</th>
        </tr>
      </thead>
      <tbody>
        {readings.slice(-10).map((r, i) => (
          <tr key={r.readingId} style={{ borderBottom: '1px solid #eee' }}>
            <td style={td}>{i + 1}</td>
            <td style={td}>{parseFloat(r.lat).toFixed(4)}</td>
            <td style={td}>{parseFloat(r.lon).toFixed(4)}</td>
            <td style={td}>{parseFloat(r.speed).toFixed(1)}</td>
            <td style={td}>{parseFloat(r.engineTemp).toFixed(1)}</td>
            <td style={td}>{new Date(r.timestamp).toLocaleTimeString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 500 };
const td = { padding: '10px 14px' };