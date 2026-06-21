from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_product_image"),
        ("transactions", "0004_alter_transaction_receipt_number"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transactionlineitem",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="line_items",
                to="catalog.product",
            ),
        ),
    ]
