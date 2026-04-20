using VehicleTelemetryAPI.Data;
using Microsoft.EntityFrameworkCore;  


namespace VehicleTelemetryAPI.Services
{
    public class VehicleSummary
    {
        public int VehicleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal PeakSpeed { get; set; }
        public decimal AvgEngineTemp { get; set; }
        public int TotalReadings { get; set; }
        public DateTime? LastSeen { get; set; }
    }

    public class VehicleService
    {
        private readonly TelemetryDbContext _db;
        public VehicleService(TelemetryDbContext db) => _db = db;

        public async Task<VehicleSummary> ComputeSummary(int vehicleId)
        {
            var vehicle = await _db.Vehicles.FindAsync(vehicleId)
                ?? throw new KeyNotFoundException($"Vehicle {vehicleId} not found");

            var readings = await _db.VehicleReadings
                .Where(r => r.VehicleId == vehicleId)
                .ToListAsync();

            return new VehicleSummary
            {
                VehicleId = vehicleId,
                Name = vehicle.Name,
                PeakSpeed = readings.Any() ? readings.Max(r => r.Speed) : 0,
                AvgEngineTemp = readings.Any() ? Math.Round(readings.Average(r => r.EngineTemp), 2) : 0,
                TotalReadings = readings.Count,
                LastSeen = readings.Any() ? readings.Max(r => r.Timestamp) : null
            };
        }

        // Top 5 vehicles by peak speed today
        public async Task<List<object>> GetTop5ByPeakSpeedToday()
        {
            var today = DateTime.UtcNow.Date;

            // Group by VehicleId on the server, then join to Vehicles to get the name.
            var top = await _db.VehicleReadings
                .Where(r => r.Timestamp >= today)
                .GroupBy(r => r.VehicleId)
                .Select(g => new
                {
                    VehicleId = g.Key,
                    PeakSpeed = g.Max(r => r.Speed)
                })
                .Join(_db.Vehicles,
                      g => g.VehicleId,
                      v => v.VehicleId,
                      (g, v) => new { g.VehicleId, v.Name, g.PeakSpeed })
                .OrderByDescending(x => x.PeakSpeed)
                .Take(5)
                .ToListAsync();

            // Cast to objects after materializing the query to avoid runtime translation issues.
            return top.Cast<object>().ToList();
        }

        // Average engine temp per hour for a vehicle
        public async Task<List<object>> GetAvgEngineTempPerHour(int vehicleId)
        {
            // Compute the raw averages on the server, materialize, then round on the client.
            var raw = await _db.VehicleReadings
                .Where(r => r.VehicleId == vehicleId)
                .GroupBy(r => r.Timestamp.Hour)
                .Select(g => new
                {
                    Hour = g.Key,
                    AvgTemp = g.Average(r => r.EngineTemp)
                })
                .OrderBy(x => x.Hour)
                .ToListAsync();

            return raw
                .Select(x => (object)new { Hour = x.Hour, AvgTemp = Math.Round(x.AvgTemp, 2) })
                .ToList();
        }
    }
}
