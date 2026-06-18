from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_date


@dataclass(frozen=True)
class ReportPeriod:
    period: str
    label: str
    start: date
    end: date


def resolve_report_period(request) -> ReportPeriod:
    period = request.query_params.get("period", "month").lower()
    today = timezone.localdate()

    if period == "week":
        anchor = parse_date(request.query_params.get("date", "")) or today
        start = anchor - timedelta(days=anchor.weekday())
        end = start + timedelta(days=6)
        label = f"Week of {start.strftime('%b %d, %Y')}"
        return ReportPeriod("week", label, start, end)

    if period == "month":
        month_value = request.query_params.get("month", "")
        if month_value and "-" in month_value:
            year_str, month_str = month_value.split("-", 1)
            year, month = int(year_str), int(month_str)
        else:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month) or today.month)
        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        label = start.strftime("%B %Y")
        return ReportPeriod("month", label, start, end)

    if period == "quarter":
        year = int(request.query_params.get("year", today.year))
        quarter = int(request.query_params.get("quarter", (today.month - 1) // 3 + 1))
        quarter = max(1, min(4, quarter))
        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2
        start = date(year, start_month, 1)
        end = date(year, end_month, monthrange(year, end_month)[1])
        label = f"Q{quarter} {year}"
        return ReportPeriod("quarter", label, start, end)

    if period == "year":
        year = int(request.query_params.get("year", today.year))
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        label = str(year)
        return ReportPeriod("year", label, start, end)

    if period == "range":
        start = parse_date(request.query_params.get("start", "")) or today
        end = parse_date(request.query_params.get("end", "")) or today
        if start > end:
            start, end = end, start
        label = f"{start.strftime('%b %d, %Y')} – {end.strftime('%b %d, %Y')}"
        return ReportPeriod("range", label, start, end)

    target = parse_date(request.query_params.get("date", "")) or today
    label = target.strftime("%b %d, %Y")
    return ReportPeriod("day", label, target, target)


def filter_transactions_by_period(queryset, report_period: ReportPeriod):
    return queryset.filter(
        created_at__date__gte=report_period.start,
        created_at__date__lte=report_period.end,
    )


def revenue_trend_for_period(queryset, report_period: ReportPeriod) -> list[dict[str, str]]:
    days = (report_period.end - report_period.start).days + 1

    if days <= 31:
        daily_revenue = {
            row["day"]: row["revenue"]
            for row in queryset.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("amount"))
        }
        return [
            {
                "date": (report_period.start + timedelta(days=offset)).isoformat(),
                "revenue": str(daily_revenue.get(report_period.start + timedelta(days=offset), 0)),
            }
            for offset in range(days)
        ]

    if days <= 120:
        points: list[dict[str, str]] = []
        cursor = report_period.start
        while cursor <= report_period.end:
            bucket_end = min(cursor + timedelta(days=6), report_period.end)
            revenue = (
                queryset.filter(
                    created_at__date__gte=cursor,
                    created_at__date__lte=bucket_end,
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )
            points.append({"date": cursor.isoformat(), "revenue": str(revenue)})
            cursor = bucket_end + timedelta(days=1)
        return points

    monthly_revenue = {
        row["month"].date(): row["revenue"]
        for row in queryset.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(revenue=Sum("amount"))
    }
    points = []
    cursor = report_period.start.replace(day=1)
    while cursor <= report_period.end:
        revenue = monthly_revenue.get(cursor, 0)
        points.append({"date": cursor.isoformat(), "revenue": str(revenue)})
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return points
