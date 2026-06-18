from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Product, ProductCategory
from apps.catalog.serializers import ProductCategorySerializer, ProductSerializer, ProductWriteSerializer
from apps.users.permissions import IsAdminOrManager


class ProductCategoryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = ProductCategory.objects.all()
        return Response(ProductCategorySerializer(queryset, many=True).data)


class ProductListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        category = request.query_params.get("category", "").strip()

        queryset = Product.objects.filter(is_active=True).select_related("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(sku__icontains=search) | Q(barcode__icontains=search)
            )
        return Response(ProductSerializer(queryset, many=True, context={"request": request}).data)


class ProductManageListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        queryset = Product.objects.select_related("category").order_by("-is_active", "name")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(sku__icontains=search) | Q(barcode__icontains=search)
            )
        return Response(ProductSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ProductWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(
            ProductSerializer(product, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductManageDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManager]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, product_id: int):
        product = get_object_or_404(Product.objects.select_related("category"), pk=product_id)
        return Response(ProductSerializer(product, context={"request": request}).data)

    def patch(self, request, product_id: int):
        product = get_object_or_404(Product, pk=product_id)
        serializer = ProductWriteSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSerializer(product, context={"request": request}).data)

    def delete(self, request, product_id: int):
        product = get_object_or_404(Product, pk=product_id)
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
