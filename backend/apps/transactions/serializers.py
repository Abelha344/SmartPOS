from __future__ import annotations

from rest_framework import serializers

from apps.payments.checkout_service import complete_sale
from apps.transactions.models import PaymentMethod, Transaction, TransactionLineItem


class CheckoutLineSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class CheckoutSerializer(serializers.Serializer):
    currency = serializers.CharField(max_length=3, default="ETB")
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    items = CheckoutLineSerializer(many=True, min_length=1)

    def validate_items(self, items: list[dict]) -> list[dict]:
        product_ids = [item["product_id"] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products must be merged into a single line item.")
        return items

    def create(self, validated_data: dict) -> Transaction:
        if validated_data["payment_method"] == PaymentMethod.CARD:
            raise serializers.ValidationError(
                {"payment_method": "Card payments must be completed through Chapa."}
            )
        return complete_sale(
            user=self.context["request"].user,
            items=validated_data["items"],
            currency=validated_data.get("currency", "ETB"),
            payment_method=validated_data["payment_method"],
        )


class TransactionLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionLineItem
        fields = (
            "sku",
            "name",
            "quantity",
            "unit_price",
            "tax_rate",
            "line_subtotal",
            "line_tax",
            "line_total",
        )


class TransactionSerializer(serializers.ModelSerializer):
    processed_by_username = serializers.CharField(source="processed_by.username", read_only=True)
    line_items = TransactionLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "receipt_number",
            "subtotal",
            "tax_amount",
            "amount",
            "currency",
            "payment_method",
            "status",
            "processed_by",
            "processed_by_username",
            "line_items",
            "created_at",
        )
        read_only_fields = fields
