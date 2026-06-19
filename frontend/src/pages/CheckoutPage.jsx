import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { ApiError, apiClient } from "../api/client";
import PaymentStatusOverlay from "../components/PaymentStatusOverlay";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/formatMoney";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { getValidAccessToken, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [basket, setBasket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const token = getValidAccessToken();
        const [categoryData, productData] = await Promise.all([
          apiClient("/catalog/categories/", {}, token),
          apiClient("/catalog/products/", {}, token),
        ]);
        setCategories(categoryData);
        setProducts(productData);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          navigate("/login");
          return;
        }
        showFailure(loadError.message);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [getValidAccessToken, navigate]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category_slug === activeCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory]);

  const basketSummary = useMemo(() => {
    return basket.reduce(
      (summary, item) => {
        const lineSubtotal = item.unit_price * item.quantity;
        const lineTax = lineSubtotal * item.tax_rate;
        summary.subtotal += lineSubtotal;
        summary.tax += lineTax;
        return summary;
      },
      { subtotal: 0, tax: 0 }
    );
  }, [basket]);

  const total = basketSummary.subtotal + basketSummary.tax;
  const basketItems = basket.map((item) => ({ product_id: item.id, quantity: item.quantity }));

  const showFailure = (message) => {
    setPaymentStatus("error");
    setPaymentMessage(message);
  };

  const resetCheckout = async () => {
    setPaymentStatus(null);
    setPaymentMessage("");
    setProcessing(false);
    setBasket([]);
    try {
      const token = getValidAccessToken();
      const productData = await apiClient("/catalog/products/", {}, token);
      setProducts(productData);
    } catch {
      // Catalog refresh is best-effort after payment.
    }
  };

  const dismissFailure = () => {
    setPaymentStatus(null);
    setPaymentMessage("");
    setProcessing(false);
  };

  const addItem = (product) => {
    if (product.stock_quantity <= 0) {
      showFailure(`${product.name} is out of stock.`);
      return;
    }
    setPaymentStatus(null);
    setBasket((prev) => {
      const index = prev.findIndex((entry) => entry.id === product.id);
      if (index === -1) {
        return [...prev, { ...product, quantity: 1 }];
      }
      const current = prev[index];
      if (current.quantity >= product.stock_quantity) {
        showFailure(`Only ${product.stock_quantity} units available for ${product.name}.`);
        return prev;
      }
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: copy[index].quantity + 1 };
      return copy;
    });
  };

  const updateQuantity = (productId, delta) => {
    setBasket((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty > item.stock_quantity) {
            showFailure(`Only ${item.stock_quantity} units available for ${item.name}.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearBasket = () => {
    setBasket([]);
    setPaymentStatus(null);
    setPaymentMessage("");
  };

  const completeCashSale = async (token) => {
    const response = await apiClient(
      "/transactions/checkout/",
      {
        method: "POST",
        headers: { "X-Idempotency-Key": uuidv4() },
        body: JSON.stringify({
          currency: "ETB",
          payment_method: "CASH",
          items: basketItems,
        }),
      },
      token
    );
    setBasket([]);
    setPaymentStatus("success");
    setPaymentMessage(
      `Paid successfully. ${formatMoney(response.amount, response.currency)} received in cash. Receipt ${response.receipt_number}.`
    );
    const refreshedProducts = await apiClient("/catalog/products/", {}, token);
    setProducts(refreshedProducts);
  };

  const startChapaPayment = async (token) => {
    const response = await apiClient(
      "/payments/chapa/initialize/",
      {
        method: "POST",
        body: JSON.stringify({
          currency: "ETB",
          items: basketItems,
        }),
      },
      token
    );
    sessionStorage.setItem("smartpos_pending_tx_ref", response.tx_ref);
    sessionStorage.setItem(
      "smartpos_pending_payment",
      JSON.stringify({
        amount: response.amount,
        currency: response.currency,
      })
    );
    window.location.href = response.checkout_url;
  };

  const payNow = async () => {
    setPaymentStatus(null);
    setPaymentMessage("");
    if (basket.length === 0) {
      showFailure("Add at least one item before paying.");
      return;
    }

    setProcessing(true);
    try {
      const token = getValidAccessToken();
      if (paymentMethod === "CASH") {
        await completeCashSale(token);
      } else {
        await startChapaPayment(token);
      }
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 401) {
        navigate("/login");
        return;
      }
      showFailure(submitError.message || "Payment failed. Please try again.");
    } finally {
      if (paymentMethod === "CASH") {
        setProcessing(false);
      }
    }
  };

  return (
    <section className="pos-workspace">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Register Terminal</p>
          <h1>Point of Sale</h1>
        </div>
        <div className="pos-header-meta">
          <span>Cashier: {user?.username}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </header>

      <div className="pos-layout">
        <div className="pos-catalog">
          <div className="pos-toolbar">
            <input
              className="pos-search"
              placeholder="Search SKU, barcode, or product name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="pos-categories">
              <button
                className={activeCategory === "all" ? "chip chip-active" : "chip"}
                onClick={() => setActiveCategory("all")}
                type="button"
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={activeCategory === category.slug ? "chip chip-active" : "chip"}
                  onClick={() => setActiveCategory(category.slug)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {loadingCatalog ? (
            <p className="pos-muted">Loading catalog…</p>
          ) : (
            <div className="pos-product-grid">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  className={`pos-product-card ${product.stock_quantity === 0 ? "is-disabled" : ""}`}
                  disabled={product.stock_quantity === 0}
                  onClick={() => addItem(product)}
                  type="button"
                >
                  {product.image_url && (
                    <img alt="" className="pos-product-image" src={product.image_url} />
                  )}
                  <div className="pos-product-top">
                    <span className="pos-product-category">{product.category_name}</span>
                    <span className="pos-product-stock">{product.stock_quantity} in stock</span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="pos-product-sku">{product.sku}</p>
                  <strong>{formatMoney(product.unit_price)}</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="pos-cart">
          <div className="pos-cart-header">
            <h2>Current Sale</h2>
            <button className="text-button" onClick={clearBasket} type="button">
              Clear
            </button>
          </div>

          <div className="pos-cart-lines">
            {basket.length === 0 && <p className="pos-muted">Tap products to add them to the sale.</p>}
            {basket.map((item) => (
              <div key={item.id} className="pos-cart-line">
                <div>
                  <strong>{item.name}</strong>
                  <p>{formatMoney(item.unit_price)} each</p>
                </div>
                <div className="pos-qty-controls">
                  <button onClick={() => updateQuantity(item.id, -1)} type="button">
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} type="button">
                    +
                  </button>
                </div>
                <strong>{formatMoney(item.unit_price * item.quantity * (1 + Number(item.tax_rate)))}</strong>
              </div>
            ))}
          </div>

          <div className="pos-payment-methods">
            <span>Payment method</span>
            <div className="pos-payment-toggle">
              <button
                className={paymentMethod === "CARD" ? "chip chip-active" : "chip"}
                onClick={() => {
                  setPaymentMethod("CARD");
                  setPaymentStatus(null);
                }}
                type="button"
              >
                Chapa
              </button>
              <button
                className={paymentMethod === "CASH" ? "chip chip-active" : "chip"}
                onClick={() => {
                  setPaymentMethod("CASH");
                  setPaymentStatus(null);
                }}
                type="button"
              >
                Cash
              </button>
            </div>
          </div>

          <div className="pos-totals">
            <p>
              <span>Subtotal</span>
              <strong>{formatMoney(basketSummary.subtotal)}</strong>
            </p>
            <p>
              <span>Tax (8%)</span>
              <strong>{formatMoney(basketSummary.tax)}</strong>
            </p>
            <p className="pos-total-line">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </p>
          </div>

          <button className="pos-pay-btn" disabled={processing || basket.length === 0} onClick={payNow} type="button">
            {processing ? "Processing payment…" : `Pay ${formatMoney(total)}`}
          </button>
          <p className="pos-muted chapa-note">
            {paymentMethod === "CARD"
              ? "You will be redirected to Chapa to complete the payment."
              : "Cash is recorded instantly at the register."}
          </p>
        </aside>
      </div>

      <PaymentStatusOverlay
        actionLabel={paymentStatus === "success" ? "New Sale" : "Try Again"}
        message={paymentMessage}
        onAction={paymentStatus === "success" ? resetCheckout : dismissFailure}
        status={paymentStatus}
        title={paymentStatus === "success" ? "Paid Successfully" : "Payment Failed"}
      />
    </section>
  );
};

export default CheckoutPage;
