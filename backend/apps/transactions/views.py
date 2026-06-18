from __future__ import annotations

from django.db.models import Sum
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.transactions.models import Transaction
from apps.transactions.serializers import CheckoutSerializer, TransactionSerializer


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        transaction_obj = serializer.save()
        payload = TransactionSerializer(transaction_obj).data
        return Response(payload, status=status.HTTP_201_CREATED)


class TransactionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Transaction.objects.filter(processed_by=request.user)
        total = queryset.aggregate(total=Sum("amount"))["total"] or 0
        return Response(
            {
                "transactions": TransactionSerializer(queryset, many=True).data,
                "total_value": str(total),
            }
        )

