from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.transactions.models import IdempotencyRecord, Transaction, TransactionStatus
from apps.transactions.serializers import TransactionSerializer
from apps.users.models import RoleChangeLog
from apps.users.permissions import (
    IsAdminAuditorOrManager,
    IsAdminOrAuditor,
    IsFinancialAuditor,
    IsManager,
    IsSystemAdmin,
)
from apps.users.report_period import (
    filter_transactions_by_period,
    resolve_report_period,
    revenue_trend_for_period,
)
from apps.users.serializers import (
    RegisterSerializer,
    RoleChangeLogSerializer,
    SmartPOSTokenObtainPairSerializer,
    UpdateRoleSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = []

    def post(self, request):
        sanitized_payload = dict(request.data)
        sanitized_payload.pop("role", None)
        serializer = RegisterSerializer(data=sanitized_payload)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    permission_classes = []
    serializer_class = SmartPOSTokenObtainPairSerializer


class UpdateUserRoleView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request, user_id: int):
        target_user = get_object_or_404(User, id=user_id)
        serializer = UpdateRoleSerializer(data=request.data, context={"request": request, "target_user": target_user})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            updated_user = serializer.save()
        return Response(
            {
                "id": updated_user.id,
                "username": updated_user.username,
                "role": updated_user.role,
            }
        )


class AdminReportView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        report_period = resolve_report_period(request)
        completed = filter_transactions_by_period(
            Transaction.objects.filter(status=TransactionStatus.COMPLETED),
            report_period,
        )
        net_profit = completed.aggregate(total=Sum("amount"))["total"] or 0
        active_terminal_users = completed.values("processed_by").distinct().count()
        duplicate_aggregation = IdempotencyRecord.objects.aggregate(
            blocked_duplicate_count=Sum("duplicate_hits"),
            blocked_duplicate_value=Sum(F("duplicate_hits") * F("transaction_amount")),
        )
        revenue_trend = revenue_trend_for_period(completed, report_period)

        return Response(
            {
                "period": report_period.period,
                "label": report_period.label,
                "net_profit": str(net_profit),
                "active_terminal_users": active_terminal_users,
                "sales_count": completed.count(),
                "blocked_duplicate_count": duplicate_aggregation["blocked_duplicate_count"] or 0,
                "blocked_duplicate_value": str(duplicate_aggregation["blocked_duplicate_value"] or 0),
                "revenue_trend": revenue_trend,
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get(self, request):
        users = User.objects.order_by("username").values("id", "username", "email", "role")
        return Response(list(users))


class RoleChangeLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # ADMIN and AUDITOR can both access this endpoint.
        if self.request.user.role == "ADMIN":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsFinancialAuditor()]

    def get(self, request):
        queryset = RoleChangeLog.objects.select_related("actor", "target_user")
        return Response(RoleChangeLogSerializer(queryset, many=True).data)


def _sales_history_queryset(request):
    report_period = resolve_report_period(request)
    queryset = filter_transactions_by_period(
        Transaction.objects.filter(status=TransactionStatus.COMPLETED),
        report_period,
    )
    return report_period.period, report_period.label, queryset


class SalesHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminAuditorOrManager]

    def get(self, request):
        period, label, queryset = _sales_history_queryset(request)
        queryset = queryset.select_related("processed_by").prefetch_related("line_items").order_by("-created_at")
        summary = queryset.aggregate(total_amount=Sum("amount"))
        sales_count = queryset.count()
        return Response(
            {
                "period": period,
                "label": label,
                "summary": {
                    "sales_count": sales_count,
                    "total_amount": str(summary["total_amount"] or 0),
                },
                "sales": TransactionSerializer(queryset, many=True).data,
            }
        )


class AuditorSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAuditor]

    def get(self, request):
        duplicate_aggregation = IdempotencyRecord.objects.aggregate(
            blocked_duplicate_count=Sum("duplicate_hits"),
            blocked_duplicate_value=Sum(F("duplicate_hits") * F("transaction_amount")),
        )
        today = timezone.localdate()
        return Response(
            {
                "role_change_count": RoleChangeLog.objects.count(),
                "sales_today_count": Transaction.objects.filter(
                    status=TransactionStatus.COMPLETED,
                    created_at__date=today,
                ).count(),
                "sales_today_amount": str(
                    Transaction.objects.filter(
                        status=TransactionStatus.COMPLETED,
                        created_at__date=today,
                    ).aggregate(total=Sum("amount"))["total"]
                    or 0
                ),
                "blocked_duplicate_count": duplicate_aggregation["blocked_duplicate_count"] or 0,
                "blocked_duplicate_value": str(duplicate_aggregation["blocked_duplicate_value"] or 0),
            }
        )


class ManagerReportView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        report_period = resolve_report_period(request)
        period_sales = filter_transactions_by_period(
            Transaction.objects.filter(status=TransactionStatus.COMPLETED),
            report_period,
        )
        period_totals = period_sales.aggregate(total=Sum("amount"))

        payment_breakdown = list(
            period_sales.values("payment_method")
            .annotate(sales_count=Count("id"), total_amount=Sum("amount"))
            .order_by("payment_method")
        )
        for row in payment_breakdown:
            row["total_amount"] = str(row["total_amount"] or 0)

        cashier_performance = list(
            period_sales.values("processed_by__username")
            .annotate(sales_count=Count("id"), total_amount=Sum("amount"))
            .order_by("-total_amount")
        )
        for row in cashier_performance:
            row["cashier"] = row.pop("processed_by__username")
            row["total_amount"] = str(row["total_amount"] or 0)

        return Response(
            {
                "period": report_period.period,
                "label": report_period.label,
                "sales_count": period_sales.count(),
                "sales_amount": str(period_totals["total"] or 0),
                "active_cashiers": period_sales.values("processed_by").distinct().count(),
                "payment_breakdown": payment_breakdown,
                "cashier_performance": cashier_performance,
            }
        )

