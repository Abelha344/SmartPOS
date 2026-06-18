from django.contrib import admin

from apps.payments.models import PaymentSession


@admin.register(PaymentSession)
class PaymentSessionAdmin(admin.ModelAdmin):
    list_display = ("tx_ref", "user", "amount", "currency", "status", "created_at")
    search_fields = ("tx_ref", "user__username", "chapa_reference")
    list_filter = ("status", "currency", "created_at")
