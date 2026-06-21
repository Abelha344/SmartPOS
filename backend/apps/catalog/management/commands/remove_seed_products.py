from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.catalog.models import Product, ProductCategory

# Dummy catalog rows created by `python manage.py seed_catalog`.
DEFAULT_SEED_SKUS = (
    "ITEM-101",
    "ITEM-202",
    "ITEM-303",
    "ITEM-404",
    "ITEM-505",
    "ITEM-606",
    "ITEM-707",
    "ITEM-808",
)

DEFAULT_SEED_CATEGORY_SLUGS = ("beverages", "bakery", "supplies")

PREVIEW_SQL = """
-- Preview seed/metadata products and transaction links (run in psql or Neon SQL editor)
SELECT
    p.id,
    p.sku,
    p.name,
    p.is_active,
    COUNT(tli.id) AS line_item_count
FROM catalog_product p
LEFT JOIN transactions_transactionlineitem tli ON tli.product_id = p.id
WHERE p.sku IN (
    'ITEM-101', 'ITEM-202', 'ITEM-303', 'ITEM-404',
    'ITEM-505', 'ITEM-606', 'ITEM-707', 'ITEM-808'
)
GROUP BY p.id, p.sku, p.name, p.is_active
ORDER BY p.sku;
"""


class Command(BaseCommand):
    help = (
        "Preview and safely remove seed-catalog dummy products (from seed_catalog). "
        "Only deletes products with zero transaction line items."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Actually delete eligible products. Without this flag, only a dry-run preview runs.",
        )
        parser.add_argument(
            "--sku",
            action="append",
            dest="skus",
            help="Limit to specific SKU(s). Can be passed multiple times. Defaults to seed_catalog SKUs.",
        )
        parser.add_argument(
            "--remove-empty-categories",
            action="store_true",
            help="After deletion, remove seed categories (beverages, bakery, supplies) that have no products left.",
        )

    def handle(self, *args, **options) -> None:
        dry_run = not options["confirm"]
        target_skus = tuple(options["skus"] or DEFAULT_SEED_SKUS)

        products = (
            Product.objects.filter(sku__in=target_skus)
            .select_related("category")
            .annotate(line_item_count=Count("line_items"))
            .order_by("sku")
        )

        self.stdout.write(PREVIEW_SQL.strip())
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("=" * 72))
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no records will be deleted. Pass --confirm to apply."))
        else:
            self.stdout.write(self.style.WARNING("LIVE DELETE — eligible products will be removed."))
        self.stdout.write(self.style.WARNING("=" * 72))

        if not products.exists():
            self.stdout.write(self.style.NOTICE(f"No products found for SKU(s): {', '.join(target_skus)}"))
            return

        deletable: list[Product] = []
        blocked: list[Product] = []

        self.stdout.write("")
        self.stdout.write(f"{'SKU':<12} {'Name':<28} {'Line items':<12} {'Action'}")
        self.stdout.write("-" * 72)

        for product in products:
            action = "DELETE" if product.line_item_count == 0 else "SKIP (has sales history)"
            if product.line_item_count == 0:
                deletable.append(product)
            else:
                blocked.append(product)
            self.stdout.write(
                f"{product.sku:<12} {product.name[:28]:<28} {product.line_item_count:<12} {action}"
            )

        missing_skus = sorted(set(target_skus) - set(products.values_list("sku", flat=True)))
        if missing_skus:
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE(f"SKUs not in database: {', '.join(missing_skus)}"))

        self.stdout.write("")
        self.stdout.write(f"Eligible for deletion: {len(deletable)}")
        self.stdout.write(f"Blocked (PROTECT FK on line items): {len(blocked)}")

        if dry_run:
            if deletable:
                self.stdout.write("")
                self.stdout.write(
                    self.style.SUCCESS(
                        "Re-run with --confirm to delete the eligible products listed above."
                    )
                )
            return

        deleted_count = 0
        for product in deletable:
            product.delete()
            deleted_count += 1

        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} product(s)."))

        if options["remove_empty_categories"]:
            removed_categories = 0
            for slug in DEFAULT_SEED_CATEGORY_SLUGS:
                category = (
                    ProductCategory.objects.filter(slug=slug)
                    .annotate(product_count=Count("products"))
                    .first()
                )
                if not category:
                    continue
                if category.product_count == 0:
                    category.delete()
                    removed_categories += 1
                    self.stdout.write(self.style.SUCCESS(f"Removed empty category: {slug}"))
            if removed_categories == 0:
                self.stdout.write(self.style.NOTICE("No empty seed categories to remove."))
