from __future__ import annotations

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.chapa import ChapaClient, ChapaError, generate_tx_ref
from apps.payments.checkout_service import complete_sale
from apps.payments.models import PaymentSession, PaymentSessionStatus
from apps.payments.serializers import ChapaInitializeSerializer, ChapaVerifySerializer, PaymentSessionSerializer
from apps.transactions.models import PaymentMethod, TransactionStatus
from apps.transactions.serializers import TransactionSerializer


class ChapaInitializeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        tx_ref = generate_tx_ref()
        serializer = ChapaInitializeSerializer(
            data=request.data,
            context={"request": request, "tx_ref": tx_ref},
        )
        serializer.is_valid(raise_exception=True)
        session = serializer.save()

        user = request.user
        first_name = user.first_name or user.username
        last_name = user.last_name or "Cashier"
        client = ChapaClient()
        try:
            chapa_response = client.initialize_payment(
                amount=session.amount,
                currency=session.currency,
                email=session.customer_email,
                first_name=first_name,
                last_name=last_name,
                phone_number=session.phone_number,
                tx_ref=session.tx_ref,
                callback_url=settings.CHAPA_CALLBACK_URL,
                return_url=settings.CHAPA_RETURN_URL,
                title="Smart POS",
                description="POS sale",
                meta={"payment_session_id": str(session.id)},
            )
        except ChapaError as exc:
            session.status = PaymentSessionStatus.FAILED
            session.save(update_fields=["status", "updated_at"])
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        checkout_url = chapa_response["data"]["checkout_url"]
        session.chapa_checkout_url = checkout_url
        session.save(update_fields=["chapa_checkout_url", "updated_at"])
        return Response(
            {
                "payment_session_id": str(session.id),
                "tx_ref": session.tx_ref,
                "checkout_url": checkout_url,
                "amount": str(session.amount),
                "currency": session.currency,
            },
            status=status.HTTP_201_CREATED,
        )


class ChapaVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChapaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tx_ref = serializer.validated_data["tx_ref"]

        try:
            session = PaymentSession.objects.select_related("transaction").get(
                tx_ref=tx_ref,
                user=request.user,
            )
        except PaymentSession.DoesNotExist:
            return Response({"detail": "Payment session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status == PaymentSessionStatus.COMPLETED and session.transaction:
            return Response(
                {
                    "status": "completed",
                    "transaction": TransactionSerializer(session.transaction).data,
                }
            )

        client = ChapaClient()
        try:
            verify_response = client.verify_payment(tx_ref)
        except ChapaError as exc:
            session.status = PaymentSessionStatus.FAILED
            session.save(update_fields=["status", "updated_at"])
            return Response({"detail": str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)

        payment_data = verify_response.get("data", {})
        if payment_data.get("status") != "success":
            session.status = PaymentSessionStatus.FAILED
            session.save(update_fields=["status", "updated_at"])
            return Response({"detail": "Payment was not successful."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        transaction_obj = complete_sale(
            user=request.user,
            items=session.items_payload,
            currency=session.currency,
            payment_method=PaymentMethod.CARD,
            status=TransactionStatus.COMPLETED,
        )
        session.status = PaymentSessionStatus.COMPLETED
        session.chapa_reference = payment_data.get("reference", "")
        session.transaction = transaction_obj
        session.save(update_fields=["status", "chapa_reference", "transaction", "updated_at"])

        return Response(
            {
                "status": "completed",
                "transaction": TransactionSerializer(transaction_obj).data,
            }
        )


class ChapaWebhookView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get("x-chapa-signature")
        client = ChapaClient()
        if not client.validate_webhook_signature(request.body, signature):
            return Response({"detail": "Invalid webhook signature."}, status=status.HTTP_403_FORBIDDEN)

        tx_ref = request.data.get("tx_ref") or request.data.get("trx_ref")
        if not tx_ref:
            return Response({"detail": "Missing transaction reference."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = PaymentSession.objects.select_related("transaction", "user").get(tx_ref=tx_ref)
        except PaymentSession.DoesNotExist:
            return Response({"detail": "Unknown payment session."}, status=status.HTTP_404_NOT_FOUND)

        if session.status == PaymentSessionStatus.COMPLETED:
            return Response({"status": "already_completed"})

        if request.data.get("status") != "success":
            session.status = PaymentSessionStatus.FAILED
            session.save(update_fields=["status", "updated_at"])
            return Response({"status": "failed"})

        transaction_obj = complete_sale(
            user=session.user,
            items=session.items_payload,
            currency=session.currency,
            payment_method=PaymentMethod.CARD,
            status=TransactionStatus.COMPLETED,
        )
        session.status = PaymentSessionStatus.COMPLETED
        session.chapa_reference = request.data.get("reference", "")
        session.transaction = transaction_obj
        session.save(update_fields=["status", "chapa_reference", "transaction", "updated_at"])
        return Response({"status": "completed"})
