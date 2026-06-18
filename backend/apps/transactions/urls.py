from django.urls import path

from apps.transactions.views import CheckoutView, TransactionListView

urlpatterns = [
    path("transactions/checkout/", CheckoutView.as_view(), name="checkout"),
    path("transactions/my-ledger/", TransactionListView.as_view(), name="my-ledger"),
]

