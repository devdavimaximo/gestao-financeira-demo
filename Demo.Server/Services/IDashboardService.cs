using Demo.Server.DTOs;

namespace Demo.Server.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int? month = null, int? year = null);
}
