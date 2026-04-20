using System.ComponentModel.DataAnnotations;

namespace VehicleTelemetryAPI.Models
{
    public class Vehicle
    {
        [Key]
        public int VehicleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string LicensePlate { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public ICollection<VehicleReading> Readings { get; set; } = new List<VehicleReading>();
    }
}
