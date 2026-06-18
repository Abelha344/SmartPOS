import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatMoney } from "../utils/formatMoney";

const PAYMENT_OPTIONS = [
  { id: "telebirr", label: "Telebirr", hint: "Pay with mobile wallet" },
  { id: "card", label: "Card", hint: "Debit or credit card" },
  { id: "cbe", label: "CBE Birr", hint: "Commercial Bank of Ethiopia" },
];

const ChapaMockCheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState("telebirr");
  const [processing, setProcessing] = useState(false);

  const txRef = searchParams.get("tx_ref") || sessionStorage.getItem("smartpos_pending_tx_ref");
  const pendingPayment = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("smartpos_pending_payment");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const amount = Number(pendingPayment?.amount || 0);
  const currency = pendingPayment?.currency || "ETB";

  const completePayment = () => {
    if (!txRef) return;
    setProcessing(true);
    window.location.href = `/checkout/payment-return?tx_ref=${encodeURIComponent(txRef)}`;
  };

  const failPayment = () => {
    if (!txRef) return;
    window.location.href = `/checkout/payment-return?tx_ref=${encodeURIComponent(txRef)}&failed=1`;
  };

  if (!txRef) {
    return (
      <div className="chapa-page">
        <div className="chapa-shell">
          <div className="chapa-card">
            <h1>Session expired</h1>
            <p className="pos-muted">Start a new sale from the register.</p>
            <button className="chapa-pay-btn" onClick={() => navigate("/checkout")} type="button">
              Back to Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chapa-page">
      <div className="chapa-shell">
        <div className="chapa-topbar">
          <span className="chapa-logo">chapa</span>
          <span className="chapa-secure-pill">Secure checkout</span>
        </div>

        <div className="chapa-card">
          <p className="chapa-merchant">Smart POS</p>
          <h1>Pay {formatMoney(amount, currency)}</h1>
          <p className="chapa-subtitle">Choose how you want to pay</p>

          <div className="chapa-methods">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={selectedMethod === option.id ? "chapa-method chapa-method-active" : "chapa-method"}
                onClick={() => setSelectedMethod(option.id)}
                type="button"
              >
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </button>
            ))}
          </div>

          <button className="chapa-pay-btn" disabled={processing} onClick={completePayment} type="button">
            {processing ? "Processing…" : `Pay ${formatMoney(amount, currency)}`}
          </button>
          <button className="chapa-fail-btn" disabled={processing} onClick={failPayment} type="button">
            Simulate failed payment
          </button>
          <button className="chapa-cancel-btn" onClick={() => navigate("/checkout")} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapaMockCheckoutPage;
