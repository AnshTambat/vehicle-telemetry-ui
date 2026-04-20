using System.ComponentModel.DataAnnotations;

namespace VehicleTelemetryAPI.Models
{
    public class VehicleReading
    {
        [Key]
        public int ReadingId { get; set; }
        public int VehicleId { get; set; }
        public decimal Speed { get; set; }
        public decimal EngineTemp { get; set; }
        public decimal Lat { get; set; }
        public decimal Lon { get; set; }
        public DateTime Timestamp { get; set; }
        public Vehicle? Vehicle { get; set; }
    }
}
