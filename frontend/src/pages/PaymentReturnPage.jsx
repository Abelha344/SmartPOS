import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, apiClient } from "../api/client";
import PaymentStatusOverlay from "../components/PaymentStatusOverlay";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/formatMoney";

const PaymentReturnPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getValidAccessToken } = useAuth();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const txRef = useMemo(
    () => searchParams.get("tx_ref") || searchParams.get("trx_ref") || sessionStorage.getItem("smartpos_pending_tx_ref"),
    [searchParams]
  );

  useEffect(() => {
    const verifyPayment = async () => {
      if (searchParams.get("failed") === "1") {
        sessionStorage.removeItem("smartpos_pending_tx_ref");
        sessionStorage.removeItem("smartpos_pending_payment");
        setStatus("error");
        setMessage("Chapa payment was declined. Please try another method or use cash.");
        return;
      }

      if (!txRef) {
        setStatus("error");
        setMessage("Payment reference was not found.");
        return;
      }

      try {
        const token = getValidAccessToken();
        const response = await apiClient(
          "/payments/chapa/verify/",
          {
            method: "POST",
            body: JSON.stringify({ tx_ref: txRef }),
          },
          token
        );
        sessionStorage.removeItem("smartpos_pending_tx_ref");
        sessionStorage.removeItem("smartpos_pending_payment");
        setStatus("success");
        setMessage(
          `Chapa payment of ${formatMoney(response.transaction.amount, response.transaction.currency)} completed. Receipt ${response.transaction.receipt_number}.`
        );
      } catch (verifyError) {
        if (verifyError instanceof ApiError && verifyError.status === 401) {
          navigate("/login");
          return;
        }
        setStatus("error");
        setMessage(verifyError.message || "Chapa payment failed. Please try again.");
      }
    };

    verifyPayment();
  }, [txRef, getValidAccessToken, navigate, searchParams]);

  if (status === "verifying") {
    return (
      <div className="payment-processing-page">
        <div className="payment-processing-card">
          <div className="payment-processing-spinner" />
          <h1>Processing payment…</h1>
          <p className="pos-muted">Confirming your Chapa transaction.</p>
        </div>
      </div>
    );
  }

  return (
    <PaymentStatusOverlay
      actionLabel={status === "success" ? "New Sale" : "Back to Register"}
      message={message}
      onAction={() => navigate("/checkout")}
      status={status}
      title={status === "success" ? "Payment Successful" : "Payment Failed"}
    />
  );
};

export default PaymentReturnPage;
