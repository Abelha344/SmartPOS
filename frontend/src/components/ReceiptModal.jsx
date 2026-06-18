import { formatMoney } from "../utils/formatMoney";

const ReceiptModal = ({ receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <div className="receipt-overlay" onClick={onClose} role="presentation">
      <div className="receipt-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header className="receipt-header">
          <div>
            <p className="receipt-brand">Smart POS</p>
            <h2>Payment Complete</h2>
          </div>
          <button className="receipt-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <div className="receipt-meta">
          <p>
            <span>Receipt</span>
            <strong>{receipt.receipt_number}</strong>
          </p>
          <p>
            <span>Payment</span>
            <strong>{receipt.payment_method}</strong>
          </p>
          <p>
            <span>Cashier</span>
            <strong>{receipt.processed_by_username}</strong>
          </p>
          <p>
            <span>Date</span>
            <strong>{new Date(receipt.created_at).toLocaleString()}</strong>
          </p>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {receipt.line_items.map((item) => (
              <tr key={`${item.sku}-${item.quantity}`}>
                <td>
                  <strong>{item.name}</strong>
                  <small>{item.sku}</small>
                </td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <p>
            <span>Subtotal</span>
            <strong>{formatMoney(receipt.subtotal)}</strong>
          </p>
          <p>
            <span>Tax</span>
            <strong>{formatMoney(receipt.tax_amount)}</strong>
          </p>
          <p className="receipt-grand-total">
            <span>Total Paid</span>
            <strong>{formatMoney(receipt.amount)}</strong>
          </p>
        </div>

        <button className="auth-primary-btn" onClick={onClose} type="button">
          New Sale
        </button>
      </div>
    </div>
  );
};

export default ReceiptModal;
