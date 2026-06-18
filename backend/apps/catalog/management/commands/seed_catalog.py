from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.catalog.models import Product, ProductCategory


class Command(BaseCommand):
    help = "Seed default retail catalog for Smart POS."

    def handle(self, *args, **options) -> None:
        categories = {
            "beverages": ProductCategory.objects.get_or_create(
                slug="beverages", defaults={"name": "Beverages", "sort_order": 1}
            )[0],
            "bakery": ProductCategory.objects.get_or_create(
                slug="bakery", defaults={"name": "Bakery", "sort_order": 2}
            )[0],
            "supplies": ProductCategory.objects.get_or_create(
                slug="supplies", defaults={"name": "Supplies", "sort_order": 3}
            )[0],
        }

        products = [
            ("ITEM-101", "880100000101", "Espresso Beans 1kg", "beverages", "850.00", 48),
            ("ITEM-202", "880100000202", "Whole Milk 1L", "beverages", "95.00", 120),
            ("ITEM-303", "880100000303", "Butter Croissant", "bakery", "65.00", 60),
            ("ITEM-404", "880100000404", "Thermal Receipt Roll", "supplies", "35.00", 200),
            ("ITEM-505", "880100000505", "Cold Brew Bottle", "beverages", "120.00", 72),
            ("ITEM-606", "880100000606", "Blueberry Muffin", "bakery", "85.00", 40),
            ("ITEM-707", "880100000707", "Sanitizer Spray", "supplies", "210.00", 35),
            ("ITEM-808", "880100000808", "Sparkling Water", "beverages", "45.00", 96),
        ]

        for sku, barcode, name, category_slug, price, stock in products:
            Product.objects.update_or_create(
                sku=sku,
                defaults={
                    "barcode": barcode,
                    "name": name,
                    "category": categories[category_slug],
                    "unit_price": Decimal(price),
                    "tax_rate": Decimal("0.0800"),
                    "stock_quantity": stock,
                    "is_active": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(products)} products."))
