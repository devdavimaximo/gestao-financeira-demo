namespace Demo.Server.Application.DTOs.Calendar;

public record CalendarEventDto(
    Guid Id,
    string Title,
    decimal Amount,
    string Date,
    string EventType,
    string Status,
    string UnitName
);
