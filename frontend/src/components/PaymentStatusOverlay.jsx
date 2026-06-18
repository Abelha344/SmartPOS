const PaymentStatusOverlay = ({ status, title, message, actionLabel = "New Sale", onAction }) => {
  if (!status) return null;

  const isSuccess = status === "success";

  return (
    <div className={`payment-overlay payment-overlay--${status}`} role="alertdialog" aria-modal="true">
      <div className="payment-overlay-card">
        <div className={`payment-overlay-icon ${isSuccess ? "is-success" : "is-error"}`}>
          {isSuccess ? "✓" : "!"}
        </div>
        <h2>{title}</h2>
        {message && <p>{message}</p>}
        <button className={isSuccess ? "payment-overlay-btn-success" : "payment-overlay-btn-error"} onClick={onAction} type="button">
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

export default PaymentStatusOverlay;
