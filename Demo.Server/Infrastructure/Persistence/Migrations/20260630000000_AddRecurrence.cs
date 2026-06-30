using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Demo.Server.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "RecurrenceEndDate",
                table: "FinancialEntries",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceFrequency",
                table: "FinancialEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrenceInterval",
                table: "FinancialEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ParentEntryId",
                table: "FinancialEntries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinancialEntries_ParentEntryId",
                table: "FinancialEntries",
                column: "ParentEntryId");

            migrationBuilder.AddForeignKey(
                name: "FK_FinancialEntries_FinancialEntries_ParentEntryId",
                table: "FinancialEntries",
                column: "ParentEntryId",
                principalTable: "FinancialEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FinancialEntries_FinancialEntries_ParentEntryId",
                table: "FinancialEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinancialEntries_ParentEntryId",
                table: "FinancialEntries");

            migrationBuilder.DropColumn(
                name: "ParentEntryId",
                table: "FinancialEntries");

            migrationBuilder.DropColumn(
                name: "RecurrenceEndDate",
                table: "FinancialEntries");

            migrationBuilder.DropColumn(
                name: "RecurrenceFrequency",
                table: "FinancialEntries");

            migrationBuilder.DropColumn(
                name: "RecurrenceInterval",
                table: "FinancialEntries");
        }
    }
}
