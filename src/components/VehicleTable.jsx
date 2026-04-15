import { useEffect, useState } from 'react';
import { getVehicles, getLatestReading } from '../services/api';

export default function VehicleTable({ onSelect, selectedId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVehicles().then(async ({ data: vehicles }) => {
      const enriched = await Promise.all(vehicles.map(async v => {
        try {
          const { data: r } = await getLatestReading(v.vehicleId);
          return { 
            ...v, 
            speed:      r.speed, 
            engineTemp: r.engineTemp, 
            lastSeen:   r.timestamp 
          };
        } catch {
          return { ...v, speed: '—', engineTemp: '—', lastSeen: '—' };
        }
      }));
      setRows(enriched);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading vehicles...</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f0f4ff' }}>
          <th style={th}>Vehicle</th>
          <th style={th}>License Plate</th>
          <th style={th}>Speed (km/h)</th>
          <th style={th}>Engine Temp (°C)</th>
          <th style={th}>Last Seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(v => (
          <tr 
            key={v.vehicleId} 
            onClick={() => onSelect(v.vehicleId)}
            style={{ 
              cursor: 'pointer', 
              borderBottom: '1px solid #eee',
              background: selectedId === v.vehicleId ? '#e8f0fe' : 'white'
            }}>
            <td style={td}>{v.name}</td>
            <td style={td}>{v.licensePlate}</td>
            <td style={td}>{typeof v.speed      === 'number' ? v.speed.toFixed(1)      : v.speed}</td>
            <td style={td}>{typeof v.engineTemp === 'number' ? v.engineTemp.toFixed(1) : v.engineTemp}</td>
            <td style={td}>{v.lastSeen !== '—' ? new Date(v.lastSeen).toLocaleString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 14 };
const td = { padding: '10px 14px', fontSize: 14 };