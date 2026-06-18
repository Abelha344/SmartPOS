from django.urls import path

from apps.payments.views import ChapaInitializeView, ChapaVerifyView, ChapaWebhookView

urlpatterns = [
    path("payments/chapa/initialize/", ChapaInitializeView.as_view(), name="chapa-initialize"),
    path("payments/chapa/verify/", ChapaVerifyView.as_view(), name="chapa-verify"),
    path("payments/chapa/webhook/", ChapaWebhookView.as_view(), name="chapa-webhook"),
]
