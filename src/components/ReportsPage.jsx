import { useState, useEffect } from 'react';
import { getVehicles, getLatestReading, getVehicleSummary, getTop5Today } from '../services/api';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    generateReports();
  }, []);

  const generateReports = async () => {
    try {
      setLoading(true);

      // Get all vehicles
      const { data: vehicles } = await getVehicles();

      // Generate vehicle summary report
      const vehicleSummaries = await Promise.all(
        vehicles.map(async (vehicle) => {
          try {
            const { data: summary } = await getVehicleSummary(vehicle.vehicleId);
            const { data: latestReading } = await getLatestReading(vehicle.vehicleId);
            return {
              vehicleId: vehicle.vehicleId,
              name: vehicle.name,
              licensePlate: vehicle.licensePlate,
              totalReadings: summary.totalReadings || 0,
              peakSpeed: summary.peakSpeed || 'N/A',
              currentSpeed: latestReading?.speed || 'N/A',
              currentTemp: latestReading?.engineTemp || 'N/A',
              lastReading: latestReading?.timestamp || 'N/A',
              status: latestReading ? 'Active' : 'Offline'
            };
          } catch (error) {
            console.error(`Error fetching data for ${vehicle.vehicleId}:`, error);
            return {
              vehicleId: vehicle.vehicleId,
              name: vehicle.name,
              licensePlate: vehicle.licensePlate,
              totalReadings: 0,
              peakSpeed: 'N/A',
              currentSpeed: 'N/A',
              currentTemp: 'N/A',
              lastReading: 'N/A',
              status: 'Offline'
            };
          }
        })
      );

      // Get top 5 speed report
      let top5Data = [];
      try {
        const { data: top5 } = await getTop5Today();
        if (Array.isArray(top5)) {
          top5Data = top5.slice(0, 5);
        }
      } catch (error) {
        console.error('Error fetching top 5 data:', error);
        // Fallback: sort vehicles by their peak speed from summary
        top5Data = vehicleSummaries
          .filter(v => v.peakSpeed !== 'N/A' && v.peakSpeed > 0)
          .sort((a, b) => b.peakSpeed - a.peakSpeed)
          .slice(0, 5)
          .map(v => ({
            vehicleId: v.vehicleId,
            name: v.name,
            peakSpeed: v.peakSpeed,
            recordedAt: v.lastReading
          }));
      }

      const reportData = [
        {
          id: 'vehicle-summary',
          title: 'Vehicle Summary Report',
          description: 'Comprehensive summary of all vehicles including readings count, max speed, and current status',
          data: vehicleSummaries,
          lastUpdated: new Date().toLocaleString()
        },
        {
          id: 'top-speed',
          title: 'Top Speed Report',
          description: 'Top 5 vehicles by maximum speed recorded today',
          data: top5Data,
          lastUpdated: new Date().toLocaleString()
        }
      ];

      setReports(reportData);
    } catch (error) {
      console.error('Error generating reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report) => {
    let csvContent = '';

    if (report.id === 'vehicle-summary') {
      csvContent = 'Vehicle ID,Name,License Plate,Total Readings,Peak Speed (km/h),Current Speed (km/h),Engine Temp (°C),Status\n';
      report.data.forEach(vehicle => {
        csvContent += `${vehicle.vehicleId},${vehicle.name},${vehicle.licensePlate},${vehicle.totalReadings || 'N/A'},${vehicle.peakSpeed || 'N/A'},${vehicle.currentSpeed || 'N/A'},${vehicle.currentTemp || 'N/A'},${vehicle.status || 'Unknown'}\n`;
      });
    } else if (report.id === 'top-speed') {
      csvContent = 'Rank,Vehicle ID,Name,Peak Speed (km/h),Recorded At\n';
      report.data.forEach((vehicle, index) => {
        csvContent += `${index + 1},${vehicle.vehicleId},${vehicle.name || 'Unknown'},${vehicle.peakSpeed || 'N/A'},${vehicle.recordedAt || 'N/A'}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Download comprehensive vehicle telemetry reports</p>
      </div>

      <div className="reports-grid">
        {reports.map(report => (
          <div key={report.id} className="report-card">
            <div className="report-header">
              <h3>{report.title}</h3>
              <div className="report-actions">
                <button
                  className="btn-secondary"
                  onClick={() => viewReportDetails(report)}
                >
                  View Details
                </button>
                <button
                  className="btn-primary"
                  onClick={() => downloadReport(report)}
                >
                  Download CSV
                </button>
              </div>
            </div>
            <p className="report-description">{report.description}</p>
            <div className="report-meta">
              <span>Last updated: {report.lastUpdated}</span>
              <span>{report.data.length} records</span>
            </div>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="report-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedReport.title}</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedReport(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              {selectedReport.id === 'vehicle-summary' && (
                <div className="summary-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>License Plate</th>
                        <th>Total Readings</th>
                        <th>Peak Speed</th>
                        <th>Current Speed</th>
                        <th>Engine Temp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.data.map(vehicle => (
                        <tr key={vehicle.vehicleId}>
                          <td>{vehicle.name}</td>
                          <td>{vehicle.licensePlate}</td>
                          <td>{vehicle.totalReadings || 'N/A'}</td>
                          <td>{vehicle.peakSpeed || 'N/A'} km/h</td>
                          <td>{vehicle.currentSpeed || 'N/A'} km/h</td>
                          <td>{vehicle.currentTemp || 'N/A'}°C</td>
                          <td>{vehicle.status || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReport.id === 'top-speed' && (
                <div className="summary-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Vehicle</th>
                        <th>Peak Speed</th>
                        <th>Recorded At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.data.map((vehicle, index) => (
                        <tr key={vehicle.vehicleId}>
                          <td>{index + 1}</td>
                          <td>{vehicle.name}</td>
                          <td>{vehicle.peakSpeed || 'N/A'} km/h</td>
                          <td>{vehicle.recordedAt || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
