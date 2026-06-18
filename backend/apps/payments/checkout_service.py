from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Product
from apps.transactions.models import PaymentMethod, Transaction, TransactionLineItem, TransactionStatus

MONEY = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def build_checkout_totals(items: list[dict]) -> tuple[Decimal, Decimal, Decimal, list[dict]]:
    product_map = Product.objects.in_bulk([item["product_id"] for item in items])
    subtotal = Decimal("0.00")
    tax_amount = Decimal("0.00")
    line_payloads: list[dict] = []

    for item in items:
        product = product_map.get(item["product_id"])
        if product is None or not product.is_active:
            raise serializers.ValidationError({"items": f"Product {item['product_id']} is unavailable."})
        if product.stock_quantity < item["quantity"]:
            raise serializers.ValidationError(
                {"items": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}."}
            )

        line_subtotal = quantize_money(product.unit_price * item["quantity"])
        line_tax = quantize_money(line_subtotal * product.tax_rate)
        line_total = quantize_money(line_subtotal + line_tax)
        subtotal += line_subtotal
        tax_amount += line_tax
        line_payloads.append(
            {
                "product": product,
                "quantity": item["quantity"],
                "line_subtotal": line_subtotal,
                "line_tax": line_tax,
                "line_total": line_total,
            }
        )

    subtotal = quantize_money(subtotal)
    tax_amount = quantize_money(tax_amount)
    total = quantize_money(subtotal + tax_amount)
    return subtotal, tax_amount, total, line_payloads


def complete_sale(
    *,
    user,
    items: list[dict],
    currency: str,
    payment_method: str,
    status: str = TransactionStatus.COMPLETED,
) -> Transaction:
    subtotal, tax_amount, total, line_payloads = build_checkout_totals(items)

    with transaction.atomic():
        transaction_obj = Transaction.objects.create(
            subtotal=subtotal,
            tax_amount=tax_amount,
            amount=total,
            currency=currency.upper(),
            payment_method=payment_method,
            status=status,
            processed_by=user,
        )

        for payload in line_payloads:
            product = payload["product"]
            product.stock_quantity -= payload["quantity"]
            product.save(update_fields=["stock_quantity", "updated_at"])
            TransactionLineItem.objects.create(
                transaction=transaction_obj,
                product=product,
                sku=product.sku,
                name=product.name,
                quantity=payload["quantity"],
                unit_price=product.unit_price,
                tax_rate=product.tax_rate,
                line_subtotal=payload["line_subtotal"],
                line_tax=payload["line_tax"],
                line_total=payload["line_total"],
            )

    return transaction_obj
