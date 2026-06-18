from django.contrib import admin

from apps.catalog.models import Product, ProductCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "unit_price", "stock_quantity", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("sku", "barcode", "name")
