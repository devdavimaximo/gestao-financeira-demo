namespace Demo.Server.Domain.Constants;

public static class PermissionCodes
{
    public static class Dashboard
    {
        public const string View = "dashboard:view";
    }

    public static class Financial
    {
        public const string View    = "financial:view";
        public const string Create  = "financial:create";
        public const string Edit    = "financial:edit";
        public const string Delete  = "financial:delete";
        public const string Approve = "financial:approve";
        public const string Reverse = "financial:reverse";
        public const string Export  = "financial:export";
    }

    public static class Payables
    {
        public const string View   = "payables:view";
        public const string Create = "payables:create";
        public const string Edit   = "payables:edit";
        public const string Pay    = "payables:pay";
        public const string Cancel = "payables:cancel";
        public const string Export = "payables:export";
    }

    public static class Receivables
    {
        public const string View    = "receivables:view";
        public const string Create  = "receivables:create";
        public const string Edit    = "receivables:edit";
        public const string Receive = "receivables:receive";
        public const string Cancel  = "receivables:cancel";
        public const string Export  = "receivables:export";
    }

    public static class Budgets
    {
        public const string View   = "budgets:view";
        public const string Create = "budgets:create";
        public const string Edit   = "budgets:edit";
        public const string Close  = "budgets:close";
    }

    public static class Purchases
    {
        public const string View    = "purchases:view";
        public const string Create  = "purchases:create";
        public const string Edit    = "purchases:edit";
        public const string Delete  = "purchases:delete";
        public const string Confirm = "purchases:confirm";
        public const string Cancel  = "purchases:cancel";
    }

    public static class CashFlow
    {
        public const string View   = "cashflow:view";
        public const string Export = "cashflow:export";
    }

    public static class Calendar
    {
        public const string View = "calendar:view";
    }

    public static class Channels
    {
        public const string View   = "channels:view";
        public const string Export = "channels:export";
    }

    public static class Alerts
    {
        public const string View    = "alerts:view";
        public const string Dismiss = "alerts:dismiss";
    }

    public static class Users
    {
        public const string View              = "users:view";
        public const string Create            = "users:create";
        public const string Edit              = "users:edit";
        public const string Delete            = "users:delete";
        public const string Block             = "users:block";
        public const string ResetPassword     = "users:reset_password";
        public const string ManagePermissions = "users:manage_permissions";
    }

    public static class Units
    {
        public const string View       = "units:view";
        public const string Create     = "units:create";
        public const string Edit       = "units:edit";
        public const string Deactivate = "units:deactivate";
        public const string Delete     = "units:delete";
    }

    public static class Reports
    {
        public const string View   = "reports:view";
        public const string Export = "reports:export";
        public const string Share  = "reports:share";
    }

    public static class Settings
    {
        public const string View = "settings:view";
        public const string Edit = "settings:edit";
    }

    public static IReadOnlyList<string> All { get; } = typeof(PermissionCodes)
        .GetNestedTypes()
        .SelectMany(t => t.GetFields(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static))
        .Select(f => (string)f.GetValue(null)!)
        .ToList()
        .AsReadOnly();
}
