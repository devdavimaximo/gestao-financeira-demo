namespace Demo.Server.Application.DTOs.Channels;

public record ChannelSummaryDto(
    string ChannelName,
    decimal Amount,
    int Count,
    decimal Percentage
);
