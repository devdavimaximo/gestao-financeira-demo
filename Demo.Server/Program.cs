using Microsoft.AspNetCore.RateLimiting;
using Demo.Server.Application.Interfaces;
using Demo.Server.Infrastructure.Identity;
using Demo.Server.Infrastructure.Middleware;
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
                o.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter()));

        builder.Services.AddOpenApi();
        builder.Services.AddMemoryCache();

        builder.Services.AddDatabase(builder.Configuration);
        builder.Services.AddIdentityWithJwt(builder.Configuration);

        builder.Services.AddScoped<IJwtService, JwtService>();
        builder.Services.AddScoped<IPermissionResolverService, PermissionResolverService>();
        builder.Services.AddScoped<IAuditService, AuditService>();
        builder.Services.AddScoped<ISessionService, SessionService>();

        // 1.6 — Rate limiting: max 10 login attempts per IP per minute
        builder.Services.AddRateLimiter(options =>
        {
            options.AddFixedWindowLimiter("login", opt =>
            {
                opt.PermitLimit   = 10;
                opt.Window        = TimeSpan.FromMinutes(1);
                opt.QueueLimit    = 0;
            });
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });

        var app = builder.Build();

        app.UseDefaultFiles();
        app.MapStaticAssets();

        if (app.Environment.IsDevelopment())
            app.MapOpenApi();

        // Global exception handler — returns consistent JSON on unhandled errors
        app.UseExceptionHandler(err => err.Run(async ctx =>
        {
            var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
            ctx.Response.StatusCode  = 500;
            ctx.Response.ContentType = "application/json";
            string message;
            if (app.Environment.IsDevelopment() && ex is not null)
            {
                var parts = new System.Text.StringBuilder();
                var e = ex;
                while (e is not null)
                {
                    parts.AppendLine($"{e.GetType().Name}: {e.Message}");
                    e = e.InnerException;
                }
                parts.AppendLine(ex.StackTrace);
                message = parts.ToString();
            }
            else
            {
                message = "Erro interno do servidor.";
            }
            await ctx.Response.WriteAsJsonAsync(new { message });
        }));

        app.UseHttpsRedirection();
        app.UseRateLimiter();

        app.UseAuthentication();

        // 1.1 — Reject requests with revoked sessions before reaching controllers
        app.UseMiddleware<SessionValidationMiddleware>();

        app.UseAuthorization();
        app.MapControllers();
        app.MapFallbackToFile("/index.html");

        // Seed is idempotent — DataSeeder checks if data already exists
        await app.ApplyMigrationsAsync();
        await DataSeeder.SeedAsync(app.Services);

        await app.RunAsync();
    }
}
