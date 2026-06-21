from __future__ import annotations

from rest_framework import serializers

from apps.catalog.models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ("id", "name", "slug", "sort_order")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "sku",
            "barcode",
            "name",
            "description",
            "category",
            "category_name",
            "category_slug",
            "unit_price",
            "tax_rate",
            "stock_quantity",
            "image_url",
            "is_active",
        )

    def get_image_url(self, obj: Product) -> str | None:
        if not obj.image:
            return None
        url = obj.image.url
        if url.startswith(("http://", "https://")):
            return url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "sku",
            "barcode",
            "name",
            "description",
            "category",
            "unit_price",
            "tax_rate",
            "stock_quantity",
            "image",
            "is_active",
        )

    def validate_sku(self, value: str) -> str:
        sku = value.strip()
        if not sku:
            raise serializers.ValidationError("SKU is required.")
        queryset = Product.objects.filter(sku__iexact=sku)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return sku
