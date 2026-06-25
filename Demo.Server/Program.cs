using Demo.Server.Services;

namespace Demo.Server;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers();
        builder.Services.AddOpenApi();

        builder.Services.AddSingleton<ICategoryService, CategoryService>();
        builder.Services.AddSingleton<IAccountService, AccountService>();
        builder.Services.AddSingleton<ITransactionService, TransactionService>();
        builder.Services.AddSingleton<IBudgetService, BudgetService>();
        builder.Services.AddSingleton<IDashboardService, DashboardService>();

        var app = builder.Build();

        app.UseDefaultFiles();
        app.MapStaticAssets();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();
        app.MapFallbackToFile("/index.html");

        app.Run();
    }
}
