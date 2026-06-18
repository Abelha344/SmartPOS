import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiClient } from "../api/client";
import ReportPeriodFilter from "../components/ReportPeriodFilter";
import RevenueChart from "../components/RevenueChart";
import { useAuth } from "../context/AuthContext";
import { buildReportQuery, defaultReportFilter } from "../utils/reportPeriod";
import { formatMoney } from "../utils/formatMoney";

const AdminAnalyticsPage = () => {
  const { getValidAccessToken } = useAuth();
  const [filter, setFilter] = useState(defaultReportFilter);
  const [appliedFilter, setAppliedFilter] = useState(defaultReportFilter);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [idempotencyResult, setIdempotencyResult] = useState("");

  const queryPath = useMemo(() => `/admin/reports/${buildReportQuery(appliedFilter)}`, [appliedFilter]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getValidAccessToken();
      const response = await apiClient(queryPath, {}, token);
      setData(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [getValidAccessToken, queryPath]);

  const applyFilter = useCallback((nextFilter) => {
    const resolved = nextFilter || filter;
    setFilter(resolved);
    setAppliedFilter(resolved);
  }, [filter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const runIdempotencyStressTest = async () => {
    setIdempotencyResult("");
    try {
      const token = getValidAccessToken();
      const products = await apiClient("/catalog/products/", {}, token);
      if (!products.length) {
        setIdempotencyResult("No products available for stress test.");
        return;
      }
      const key = uuidv4();
      const payload = {
        currency: "USD",
        payment_method: "CARD",
        items: [{ product_id: products[0].id, quantity: 1 }],
      };
      const requests = Array.from({ length: 4 }).map(() =>
        apiClient(
          "/transactions/checkout/",
          {
            method: "POST",
            headers: { "X-Idempotency-Key": key },
            body: JSON.stringify(payload),
          },
          token
        )
          .then(() => ({ ok: true }))
          .catch(() => ({ ok: false }))
      );
      const responses = await Promise.all(requests);
      const accepted = responses.filter((entry) => entry.ok).length;
      setIdempotencyResult(`Stress test complete. Accepted: ${accepted}. Blocked/failed: ${4 - accepted}.`);
      await loadReports();
    } catch (requestError) {
      setIdempotencyResult(requestError.message);
    }
  };

  return (
    <section className="analytics-page">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Executive Dashboard</p>
          <h1>Analytics Hub</h1>
          {data?.label && <p className="pos-muted">Showing results for {data.label}</p>}
        </div>
      </header>

      <ReportPeriodFilter filter={filter} loading={loading} onApply={applyFilter} onChange={setFilter} />

      {error && <p className="error-text">{error}</p>}

      {data && (
        <div className="kpi-grid">
          <article className="kpi-card">
            <h3>Net Revenue</h3>
            <p>{formatMoney(data.net_profit)}</p>
          </article>
          <article className="kpi-card">
            <h3>Completed Sales</h3>
            <p>{data.sales_count}</p>
          </article>
          <article className="kpi-card">
            <h3>Active Register Users</h3>
            <p>{data.active_terminal_users}</p>
          </article>
          <article className="kpi-card">
            <h3>Prevented Duplicate Outflow</h3>
            <p>{formatMoney(data.blocked_duplicate_value)}</p>
          </article>
          <article className="kpi-card">
            <h3>Blocked Duplicate Attempts</h3>
            <p>{data.blocked_duplicate_count}</p>
          </article>
        </div>
      )}

      <div className="chart-mock">
        <h3>Financial Trend</h3>
        <p className="pos-muted">Revenue trend for the selected report period.</p>
        <RevenueChart points={data?.revenue_trend || []} />
      </div>

      <div className="chart-mock">
        <h3>Idempotency Safety Test</h3>
        <p className="pos-muted">Admin-only tool that fires four parallel checkout requests with the same idempotency key.</p>
        <button className="secondary-button" onClick={runIdempotencyStressTest} type="button">
          Run Parallel Idempotency Test
        </button>
        {idempotencyResult && <p className="success-text">{idempotencyResult}</p>}
      </div>
    </section>
  );
};

export default AdminAnalyticsPage;
