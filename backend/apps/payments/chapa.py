from __future__ import annotations

import hashlib
import hmac
import uuid
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings


class ChapaError(Exception):
    pass


class ChapaClient:
  def __init__(self) -> None:
      self.secret_key = settings.CHAPA_SECRET_KEY
      self.base_url = settings.CHAPA_BASE_URL.rstrip("/")
      # Mock checkout page is for local dev only; live always uses Chapa test/live UI.
      self.mock_mode = settings.CHAPA_MOCK_MODE and settings.DEBUG

  def _ensure_live_configuration(self) -> None:
      key = (self.secret_key or "").strip()
      if not key:
          raise ChapaError("CHAPA_SECRET_KEY is not configured.")
      if "your-secret-key" in key.lower() or key.endswith("your-public-key"):
          raise ChapaError(
              "Set your real Chapa TEST secret key in backend/.env "
              "(Dashboard → Settings → API Keys), then restart the backend."
          )

  def initialize_payment(
      self,
      *,
      amount: Decimal,
      currency: str,
      email: str,
      first_name: str,
      last_name: str,
      phone_number: str = "",
      tx_ref: str,
      callback_url: str,
      return_url: str,
      title: str,
      description: str,
      meta: dict[str, Any] | None = None,
  ) -> dict[str, Any]:
      if self.mock_mode:
          frontend_base = settings.FRONTEND_BASE_URL.rstrip("/")
          return {
              "status": "success",
              "data": {
                  "checkout_url": f"{frontend_base}/checkout/chapa-payment?tx_ref={tx_ref}",
              },
          }

      if not self.secret_key:
          raise ChapaError("CHAPA_SECRET_KEY is not configured.")

      self._ensure_live_configuration()

      payload = {
          "amount": str(quantize_chapa_amount(amount)),
          "currency": currency,
          "email": email,
          "first_name": first_name,
          "last_name": last_name,
          "tx_ref": tx_ref,
          "callback_url": callback_url,
          "return_url": return_url,
          "customization": {
              "title": truncate_chapa_text(title, CHAPA_TITLE_MAX_LENGTH),
              "description": truncate_chapa_text(description, CHAPA_DESCRIPTION_MAX_LENGTH),
          },
          "meta": meta or {},
      }
      if phone_number:
          payload["phone_number"] = phone_number
      response = requests.post(
          f"{self.base_url}/transaction/initialize",
          json=payload,
          headers=self._headers(),
          timeout=30,
      )
      return self._parse_response(response)

  def verify_payment(self, tx_ref: str) -> dict[str, Any]:
      if self.mock_mode:
          return {
              "status": "success",
              "data": {
                  "status": "success",
                  "reference": f"MOCK-{tx_ref}",
              },
          }

      if not self.secret_key:
          raise ChapaError("CHAPA_SECRET_KEY is not configured.")

      self._ensure_live_configuration()

      response = requests.get(
          f"{self.base_url}/transaction/verify/{tx_ref}",
          headers=self._headers(),
          timeout=30,
      )
      return self._parse_response(response)

  def validate_webhook_signature(self, payload: bytes, signature: str | None) -> bool:
      secret = settings.CHAPA_WEBHOOK_SECRET or self.secret_key
      if not secret or not signature:
          return False
      digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
      return hmac.compare_digest(digest, signature)

  def _headers(self) -> dict[str, str]:
      return {
          "Authorization": f"Bearer {self.secret_key}",
          "Content-Type": "application/json",
      }

  @staticmethod
  def _parse_response(response: requests.Response) -> dict[str, Any]:
      try:
          data = response.json()
      except ValueError as exc:
          raise ChapaError("Invalid response from Chapa.") from exc

      if response.status_code >= 400 or data.get("status") != "success":
          message = data.get("message") or data.get("detail") or "Chapa request failed."
          if isinstance(message, dict):
              parts = []
              for field, errors in message.items():
                  if isinstance(errors, list):
                      parts.append(f"{field}: {', '.join(str(item) for item in errors)}")
                  else:
                      parts.append(f"{field}: {errors}")
              message = "; ".join(parts) if parts else "Chapa request failed."
          raise ChapaError(str(message))
      return data


CHAPA_TITLE_MAX_LENGTH = 16
CHAPA_DESCRIPTION_MAX_LENGTH = 50


def truncate_chapa_text(value: str, max_length: int) -> str:
    return value[:max_length].strip()


def generate_tx_ref() -> str:
    return f"smartpos-{uuid.uuid4().hex}"


def quantize_chapa_amount(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"))
