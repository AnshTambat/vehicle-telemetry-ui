// New file: Simulator/SimulatorBackgroundService.cs
using VehicleTelemetryAPI.Data;
using Microsoft.Extensions.DependencyInjection;

namespace VehicleTelemetryAPI.Simulator
{
    public class SimulatorBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public SimulatorBackgroundService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<TelemetryDbContext>();
                await JourneySimulator.ReplayJourney(db);
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); // repeat every 30s
            }
        }
    }
}