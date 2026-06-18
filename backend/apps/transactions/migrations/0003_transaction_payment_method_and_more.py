import uuid

from django.db import migrations, models
from decimal import Decimal
import django.db.models.deletion


def backfill_receipt_numbers(apps, schema_editor):
    Transaction = apps.get_model("transactions", "Transaction")
    for transaction in Transaction.objects.all():
        if not transaction.receipt_number:
            stamp = transaction.created_at.strftime("%Y%m%d")
            suffix = uuid.uuid4().hex[:8].upper()
            transaction.receipt_number = f"RCP-{stamp}-{suffix}"
            transaction.save(update_fields=["receipt_number"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
        ("transactions", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="transaction",
            name="payment_method",
            field=models.CharField(choices=[("CASH", "Cash"), ("CARD", "Card")], default="CASH", max_length=16),
        ),
        migrations.AddField(
            model_name="transaction",
            name="receipt_number",
            field=models.CharField(blank=True, editable=False, max_length=32, null=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="subtotal",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12),
        ),
        migrations.AddField(
            model_name="transaction",
            name="tax_amount",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12),
        ),
        migrations.RunPython(backfill_receipt_numbers, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="transaction",
            name="receipt_number",
            field=models.CharField(editable=False, max_length=32, unique=True),
        ),
        migrations.CreateModel(
            name="TransactionLineItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sku", models.CharField(max_length=64)),
                ("name", models.CharField(max_length=255)),
                ("quantity", models.PositiveIntegerField()),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("tax_rate", models.DecimalField(decimal_places=4, max_digits=5)),
                ("line_subtotal", models.DecimalField(decimal_places=2, max_digits=12)),
                ("line_tax", models.DecimalField(decimal_places=2, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="line_items", to="catalog.product")),
                ("transaction", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="line_items", to="transactions.transaction")),
            ],
            options={
                "ordering": ["id"],
            },
        ),
    ]
