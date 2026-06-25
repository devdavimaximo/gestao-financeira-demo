using Demo.Server.Application.Interfaces;
using Demo.Server.Infrastructure.Identity;
using Demo.Server.Infrastructure.Seed;
using Demo.Server.Presentation.Extensions;

namespace Demo.Server;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers()
            .AddJsonOptions(o =>
                o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
        builder.Services.AddOpenApi();

        builder.Services.AddDatabase(builder.Configuration);
        builder.Services.AddIdentityWithJwt(builder.Configuration);
        builder.Services.AddScoped<IJwtService, JwtService>();

        var app = builder.Build();

        app.UseDefaultFiles();
        app.MapStaticAssets();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
            await app.ApplyMigrationsAsync();
            await DataSeeder.SeedAsync(app.Services);
        }

        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.MapFallbackToFile("/index.html");

        await app.RunAsync();
    }
}
