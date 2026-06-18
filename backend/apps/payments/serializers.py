from __future__ import annotations

import re

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from rest_framework import serializers

from apps.payments.checkout_service import build_checkout_totals
from apps.payments.models import PaymentSession
from apps.transactions.serializers import TransactionSerializer

User = get_user_model()


def resolve_chapa_email(user: User) -> str:
    email = (user.email or "").strip()
    if not email:
        raise serializers.ValidationError(
            {"detail": "Your account needs a valid email for Chapa payments. Update it in your profile."}
        )
    try:
        validate_email(email)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(
            {"detail": "Your account email is invalid for Chapa. Update it in your profile."}
        ) from exc
    return email


class CheckoutLineSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class ChapaInitializeSerializer(serializers.Serializer):
    currency = serializers.CharField(max_length=3, default="ETB")
    items = CheckoutLineSerializer(many=True, min_length=1)

    def validate_items(self, items: list[dict]) -> list[dict]:
        product_ids = [item["product_id"] for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products must be merged into a single line item.")
        return items

    def validate(self, attrs: dict) -> dict:
        request = self.context["request"]
        attrs["customer_email"] = resolve_chapa_email(request.user)
        attrs["phone_number"] = ""
        return attrs

    def create(self, validated_data: dict) -> PaymentSession:
        request = self.context["request"]
        items = validated_data["items"]
        subtotal, tax_amount, total, _ = build_checkout_totals(items)
        return PaymentSession.objects.create(
            tx_ref=self.context["tx_ref"],
            user=request.user,
            items_payload=items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            amount=total,
            currency=validated_data.get("currency", "ETB").upper(),
            phone_number=validated_data["phone_number"],
            customer_email=validated_data["customer_email"],
        )


class ChapaVerifySerializer(serializers.Serializer):
    tx_ref = serializers.CharField(max_length=100)


class PaymentSessionSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(read_only=True)

    class Meta:
        model = PaymentSession
        fields = (
            "id",
            "tx_ref",
            "amount",
            "currency",
            "status",
            "chapa_checkout_url",
            "chapa_reference",
            "transaction",
            "created_at",
        )
