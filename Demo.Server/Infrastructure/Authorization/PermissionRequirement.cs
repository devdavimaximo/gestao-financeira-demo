using Microsoft.AspNetCore.Authorization;

namespace Demo.Server.Infrastructure.Authorization;

public record PermissionRequirement(string Permission) : IAuthorizationRequirement;
