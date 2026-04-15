import { useEffect, useState } from 'react';
import { getReadings } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

export default function TrendChart({ vehicleId, from, to }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    setLoading(true);
    getReadings(vehicleId, from, to).then(({ data: readings }) => {
      setData(readings.map(r => ({
        time:       new Date(r.timestamp).toLocaleTimeString(),
        speed:      parseFloat(r.speed.toFixed(1)),
        engineTemp: parseFloat(r.engineTemp.toFixed(1))
      })));
      setLoading(false);
    });
  }, [vehicleId, from, to]);

  if (!vehicleId) return <p style={{ color: '#888' }}>Select a vehicle to view the trend chart.</p>;
  if (loading)   return <p>Loading chart...</p>;
  if (!data.length) return <p style={{ color: '#888' }}>No readings found for the selected time window.</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} />
        <YAxis 
          yAxisId="speed" 
          label={{ value: 'km/h', angle: -90, position: 'insideLeft', fontSize: 12 }} />
        <YAxis 
          yAxisId="temp" 
          orientation="right"
          label={{ value: '°C', angle: 90, position: 'insideRight', fontSize: 12 }} />
        <Tooltip 
          formatter={(val, name) => 
            name === 'speed' ? [`${val} km/h`, 'Speed'] : [`${val} °C`, 'Engine Temp']} />
        <Legend />
        <Line yAxisId="speed" type="monotone" dataKey="speed"      stroke="#2563eb" dot={false} name="speed" />
        <Line yAxisId="temp"  type="monotone" dataKey="engineTemp" stroke="#dc2626" dot={false} name="engineTemp" />
      </LineChart>
    </ResponsiveContainer>
  );
}