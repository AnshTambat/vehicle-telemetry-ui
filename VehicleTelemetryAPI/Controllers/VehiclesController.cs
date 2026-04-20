using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VehicleTelemetryAPI.Data;
using Microsoft.EntityFrameworkCore;
using VehicleTelemetryAPI.Models;
using VehicleTelemetryAPI.Services;

namespace VehicleTelemetryAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly TelemetryDbContext _db;
        private readonly VehicleService _svc;

        public VehiclesController(TelemetryDbContext db, VehicleService svc)
        {
            _db = db; _svc = svc;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _db.Vehicles.AsNoTracking().ToListAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var v = await _db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.VehicleId == id);
            return v is null ? NotFound() : Ok(v);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Vehicle v)
        {
            _db.Vehicles.Add(v);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = v.VehicleId }, v);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var v = await _db.Vehicles.FindAsync(id);
            if (v is null) return NotFound();
            _db.Vehicles.Remove(v);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{id}/summary")]
        public async Task<IActionResult> Summary(int id) =>
            Ok(await _svc.ComputeSummary(id));

        [HttpGet("top5-speed-today")]
        public async Task<IActionResult> Top5() =>
            Ok(await _svc.GetTop5ByPeakSpeedToday());
    }
}
