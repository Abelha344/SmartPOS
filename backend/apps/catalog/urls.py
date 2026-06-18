from django.urls import path

from apps.catalog.views import (
    ProductCategoryListView,
    ProductListView,
    ProductManageDetailView,
    ProductManageListView,
)

urlpatterns = [
    path("catalog/categories/", ProductCategoryListView.as_view(), name="catalog-categories"),
    path("catalog/products/", ProductListView.as_view(), name="catalog-products"),
    path("catalog/manage/products/", ProductManageListView.as_view(), name="catalog-manage-products"),
    path("catalog/manage/products/<int:product_id>/", ProductManageDetailView.as_view(), name="catalog-manage-product-detail"),
]
