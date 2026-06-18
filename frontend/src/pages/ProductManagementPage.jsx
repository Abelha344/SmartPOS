import { useCallback, useEffect, useState } from "react";
import { apiClient, apiFormClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/formatMoney";

const makeSku = (name) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "ITEM"}-${Date.now().toString().slice(-4)}`;
};

const ProductManagementPage = () => {
  const { getValidAccessToken } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    const token = getValidAccessToken();
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const productData = await apiClient(`/catalog/manage/products/${query}`, {}, token);
    setProducts(productData);
  }, [getValidAccessToken, search]);

  useEffect(() => {
    const run = async () => {
      try {
        const token = getValidAccessToken();
        const categoryData = await apiClient("/catalog/categories/", {}, token);
        setCategories(categoryData);
        if (categoryData.length) {
          setCategory(String(categoryData[0].id));
        }
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    run();
  }, [getValidAccessToken]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadProducts();
      } catch (requestError) {
        setError(requestError.message);
      }
    };
    run();
  }, [loadProducts]);

  const resetImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const clearForm = () => {
    setName("");
    setPrice("");
    setStock("10");
    setEditingId(null);
    resetImage();
    if (categories.length) {
      setCategory(String(categories[0].id));
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(String(product.category));
    setPrice(String(product.unit_price));
    setStock(String(product.stock_quantity));
    setImageFile(null);
    setImagePreview(product.image_url || "");
    setError("");
    setSuccess("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPG or PNG image.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("category", category);
    formData.append("unit_price", price);
    formData.append("tax_rate", "0.08");
    formData.append("stock_quantity", stock);
    formData.append("is_active", "true");
    if (!editingId) {
      formData.append("sku", makeSku(name));
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }
    return formData;
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter a product name.");
      return;
    }
    if (!category) {
      setError("Please choose a category.");
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (Number(stock) < 0) {
      setError("Stock cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      const token = getValidAccessToken();
      const formData = buildFormData();

      if (editingId) {
        await apiFormClient(
          `/catalog/manage/products/${editingId}/`,
          { method: "PATCH", body: formData },
          token
        );
        setSuccess(`"${name.trim()}" updated.`);
      } else {
        await apiFormClient("/catalog/manage/products/", { method: "POST", body: formData }, token);
        setSuccess(`"${name.trim()}" added to the store.`);
      }
      clearForm();
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message || "Could not save the product. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from checkout?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const token = getValidAccessToken();
      await apiClient(`/catalog/manage/products/${product.id}/`, { method: "DELETE" }, token);
      setSuccess(`"${product.name}" removed from checkout.`);
      if (editingId === product.id) {
        clearForm();
      }
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const restoreProduct = async (product) => {
    setError("");
    setSuccess("");
    try {
      const token = getValidAccessToken();
      await apiClient(
        `/catalog/manage/products/${product.id}/`,
        { method: "PATCH", body: JSON.stringify({ is_active: true }) },
        token
      );
      setSuccess(`"${product.name}" is available again.`);
      await loadProducts();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="audit-page product-page">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Store Catalog</p>
          <h1>Products</h1>
          <p className="pos-muted">Add items your cashiers can sell. Image is optional.</p>
        </div>
      </header>

      {error && <p className="error-text product-alert">{error}</p>}
      {success && <p className="success-text product-alert">{success}</p>}

      {!categories.length && (
        <p className="error-text product-alert">
          No categories found. Run <code>python manage.py seed_catalog</code> in the backend to set up sample categories.
        </p>
      )}

      <section className="audit-log-section product-form-card">
        <h2>{editingId ? "Edit product" : "Add new product"}</h2>
        <form className="product-simple-form" onSubmit={saveProduct}>
          <label className="auth-field">
            <span>Product name</span>
            <input
              placeholder="e.g. Burger"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="product-simple-row">
            <label className="auth-field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Choose category</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Price (ETB)</span>
              <input
                min="1"
                placeholder="100"
                step="0.01"
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Stock</span>
              <input
                min="0"
                type="number"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
            </label>
          </div>

          <label className="auth-field product-image-field">
            <span>Product image (optional)</span>
            <input accept="image/*" onChange={handleImageChange} type="file" />
          </label>
          {imagePreview && (
            <div className="product-image-preview-wrap">
              <img alt="" className="product-image-preview" src={imagePreview} />
              <button className="secondary-button" onClick={resetImage} type="button">
                Remove image
              </button>
            </div>
          )}

          <p className="pos-muted product-hint">Tax is set to 8%. SKU is created automatically for new products.</p>

          <div className="button-row">
            <button className="auth-primary-btn" disabled={loading} type="submit">
              {loading ? "Saving…" : editingId ? "Save changes" : "Add product"}
            </button>
            {editingId && (
              <button className="secondary-button" onClick={clearForm} type="button">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="audit-log-section">
        <div className="product-list-header">
          <h2>Your products ({products.length})</h2>
          <input
            className="pos-search"
            placeholder="Search by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!products.length && <p className="pos-muted">No products yet. Add your first product above.</p>}

        <div className="product-list">
          {products.map((product) => (
            <article key={product.id} className={`product-list-card ${product.is_active ? "" : "is-inactive"}`}>
              {product.image_url && (
                <img alt="" className="product-list-thumb" src={product.image_url} />
              )}
              <div className="product-list-body">
                <strong>{product.name}</strong>
                <p className="pos-muted">
                  {product.category_name} · {formatMoney(product.unit_price)} · {product.stock_quantity} in stock
                </p>
                <p className="pos-muted">{product.is_active ? "Available at checkout" : "Hidden from checkout"}</p>
              </div>
              <div className="button-row">
                <button className="secondary-button" onClick={() => startEdit(product)} type="button">
                  Edit
                </button>
                {product.is_active ? (
                  <button className="secondary-button" onClick={() => removeProduct(product)} type="button">
                    Remove
                  </button>
                ) : (
                  <button className="secondary-button" onClick={() => restoreProduct(product)} type="button">
                    Restore
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

export default ProductManagementPage;
