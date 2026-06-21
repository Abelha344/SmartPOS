from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.catalog.models import ProductCategory

DEFAULT_CATEGORIES = (
    ("beverages", "Beverages", 1),
    ("bakery-bread", "Bakery & Bread", 2),
    ("fresh-fruits-vegetables", "Fresh Fruits & Vegetables", 3),
    ("meat-seafood", "Meat & Seafood", 4),
    ("dairy-chilled-eggs", "Dairy & Chilled Eggs", 5),
    ("pantry-staples", "Pantry Staples", 6),
)


class Command(BaseCommand):
    help = "Ensure default store product categories exist (idempotent)."

    def handle(self, *args, **options) -> None:
        created_count = 0
        for slug, name, sort_order in DEFAULT_CATEGORIES:
            _, created = ProductCategory.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "sort_order": sort_order},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))
            else:
                self.stdout.write(f"Already exists: {name}")

        self.stdout.write(
            self.style.SUCCESS(f"Done. {created_count} new categor{'y' if created_count == 1 else 'ies'} added.")
        )
