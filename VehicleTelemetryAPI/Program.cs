using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using VehicleTelemetryAPI.Data;
using VehicleTelemetryAPI.Models;
using VehicleTelemetryAPI.Services;
using VehicleTelemetryAPI.Simulator;

var builder = WebApplication.CreateBuilder(args);

// EF Core + VehicleService
builder.Services.AddDbContext<TelemetryDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<VehicleService>();
builder.Services.AddHostedService<SimulatorBackgroundService>();
// CORS
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "https://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Ensure database is migrated so tables exist. Do not seed vehicles here —
// the simulator will create fresh vehicles at runtime when needed.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TelemetryDbContext>();
    db.Database.Migrate();
}

app.UseHttpsRedirection();
app.UseCors();          // must come before UseAuthorization and MapControllers
app.UseAuthorization();

app.MapControllers();

app.Run();