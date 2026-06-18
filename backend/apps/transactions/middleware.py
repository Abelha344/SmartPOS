from __future__ import annotations

import json
from decimal import Decimal
from typing import Callable

from django.core.cache import cache
from django.db import models, transaction
from django.http import HttpRequest, JsonResponse
from django.utils.deprecation import MiddlewareMixin

from apps.transactions.models import IdempotencyRecord, IdempotencyRecordStatus

PROCESSING_TTL_SECONDS = 60 * 5
COMPLETED_TTL_SECONDS = 60 * 60 * 24


class IdempotencyMiddleware(MiddlewareMixin):
    def __init__(self, get_response: Callable):
        super().__init__(get_response)
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> JsonResponse:
        if not self._should_apply(request):
            return self.get_response(request)

        idem_key = request.headers.get("X-Idempotency-Key")
        if not idem_key:
            return JsonResponse({"detail": "X-Idempotency-Key header is required."}, status=400)

        cache_key = self._cache_key(idem_key)
        try:
            cached_entry = cache.get(cache_key)
        except Exception:
            return JsonResponse({"detail": "Redis is unavailable. Start Redis with: docker compose up -d"}, status=503)

        if cached_entry:
            status = cached_entry.get("status")
            if status == IdempotencyRecordStatus.PROCESSING:
                self._increment_duplicate(idem_key)
                return JsonResponse({"detail": "Request with this idempotency key is already processing."}, status=409)
            if status == IdempotencyRecordStatus.COMPLETED:
                self._increment_duplicate(idem_key)
                payload = cached_entry.get("payload", {})
                status_code = int(cached_entry.get("status_code", 200))
                return JsonResponse(payload, status=status_code)

        try:
            locked = cache.add(cache_key, {"status": IdempotencyRecordStatus.PROCESSING}, timeout=PROCESSING_TTL_SECONDS)
        except Exception:
            return JsonResponse({"detail": "Redis is unavailable. Start Redis with: docker compose up -d"}, status=503)

        if not locked:
            self._increment_duplicate(idem_key)
            return JsonResponse({"detail": "Request with this idempotency key is already processing."}, status=409)

        IdempotencyRecord.objects.update_or_create(
            key=idem_key,
            defaults={
                "status": IdempotencyRecordStatus.PROCESSING,
                "user_id": getattr(request.user, "id", None) if getattr(request.user, "is_authenticated", False) else None,
            },
        )

        try:
            with transaction.atomic():
                response = self.get_response(request)
        except Exception:
            cache.delete(cache_key)
            raise

        if 200 <= response.status_code < 300:
            payload = self._extract_payload(response)
            cache.set(
                cache_key,
                {
                    "status": IdempotencyRecordStatus.COMPLETED,
                    "payload": payload,
                    "status_code": response.status_code,
                },
                timeout=COMPLETED_TTL_SECONDS,
            )
            self._upsert_record(request, idem_key, payload, response.status_code)
        else:
            cache.delete(cache_key)

        return response

    @staticmethod
    def _cache_key(raw_key: str) -> str:
        return f"idempotency:{raw_key}"

    @staticmethod
    def _extract_payload(response) -> dict:
        if not getattr(response, "content", None):
            return {}
        try:
            return json.loads(response.content.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}

    @staticmethod
    def _should_apply(request: HttpRequest) -> bool:
        return request.method.upper() == "POST" and request.path.startswith("/api/v1/transactions/")

    @staticmethod
    def _resolve_amount(payload: dict) -> Decimal:
        raw = payload.get("amount")
        if raw is None:
            return Decimal("0.00")
        try:
            return Decimal(str(raw))
        except Exception:
            return Decimal("0.00")

    def _upsert_record(self, request: HttpRequest, idem_key: str, payload: dict, status_code: int) -> None:
        IdempotencyRecord.objects.update_or_create(
            key=idem_key,
            defaults={
                "status": IdempotencyRecordStatus.COMPLETED,
                "user_id": getattr(request.user, "id", None),
                "response_payload": payload,
                "response_status_code": status_code,
                "transaction_amount": self._resolve_amount(payload),
            },
        )

    @staticmethod
    def _increment_duplicate(idem_key: str) -> None:
        IdempotencyRecord.objects.filter(key=idem_key).update(duplicate_hits=models.F("duplicate_hits") + 1)

