using Microsoft.AspNetCore.Authorization;

namespace Demo.Server.Infrastructure.Authorization;

public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
        : base($"Permission:{permission}") { }
}
