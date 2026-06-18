from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class PaymentSessionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tx_ref = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payment_sessions")
    items_payload = models.JSONField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="ETB")
    phone_number = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    chapa_checkout_url = models.URLField(blank=True)
    chapa_reference = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=16, choices=PaymentSessionStatus.choices, default=PaymentSessionStatus.PENDING)
    transaction = models.OneToOneField(
        "transactions.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_session",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.tx_ref} ({self.status})"
