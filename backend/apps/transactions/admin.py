from django.contrib import admin

from apps.transactions.models import IdempotencyRecord, Transaction, TransactionLineItem


class TransactionLineItemInline(admin.TabularInline):
    model = TransactionLineItem
    extra = 0
    readonly_fields = ("sku", "name", "quantity", "unit_price", "line_total")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "receipt_number",
        "amount",
        "payment_method",
        "status",
        "processed_by",
        "created_at",
    )
    list_filter = ("status", "payment_method", "currency", "created_at")
    search_fields = ("receipt_number", "id", "processed_by__username")
    inlines = [TransactionLineItemInline]


@admin.register(IdempotencyRecord)
class IdempotencyRecordAdmin(admin.ModelAdmin):
    list_display = ("key", "status", "user", "duplicate_hits", "transaction_amount", "updated_at")
    search_fields = ("key", "user__username")
    list_filter = ("status", "updated_at")
