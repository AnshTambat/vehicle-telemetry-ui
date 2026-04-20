using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VehicleTelemetryAPI.Data;
using Microsoft.EntityFrameworkCore;
using VehicleTelemetryAPI.Models;

namespace VehicleTelemetryAPI.Controllers
{
    [ApiController]
    [Route("api/vehicles/{vehicleId}/readings")]
    public class ReadingsController : ControllerBase
    {
        private readonly TelemetryDbContext _db;
        public ReadingsController(TelemetryDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetReadings(
            int vehicleId,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {

            var q = _db.VehicleReadings.AsNoTracking().Where(r => r.VehicleId == vehicleId);
            if (from.HasValue) q = q.Where(r => r.Timestamp >= from.Value);
            if (to.HasValue) q = q.Where(r => r.Timestamp <= to.Value);

            return Ok(await q.OrderBy(r => r.Timestamp).ToListAsync());
        }

        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest(int vehicleId)
        {
            var latest = await _db.VehicleReadings.AsNoTracking()
                .Where(r => r.VehicleId == vehicleId)
                .OrderByDescending(r => r.Timestamp)
                .FirstOrDefaultAsync();
            return latest is null ? NotFound() : Ok(latest);
        }

        [HttpPost]
        public async Task<IActionResult> AddReading(int vehicleId, VehicleReading reading)
        {
            reading.VehicleId = vehicleId;
            reading.Timestamp = DateTime.UtcNow;
            _db.VehicleReadings.Add(reading);
            await _db.SaveChangesAsync();
            return Ok(reading);
        }
    }
}
