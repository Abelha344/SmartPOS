import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import ReportPeriodFilter from "../components/ReportPeriodFilter";
import { useAuth } from "../context/AuthContext";
import { buildReportQuery, defaultReportFilter } from "../utils/reportPeriod";
import { formatMoney } from "../utils/formatMoney";

const SalesHistoryPage = () => {
  const { getValidAccessToken } = useAuth();
  const [filter, setFilter] = useState(defaultReportFilter);
  const [appliedFilter, setAppliedFilter] = useState(defaultReportFilter);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const queryPath = useMemo(() => `/admin/sales-history/${buildReportQuery(appliedFilter)}`, [appliedFilter]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient(queryPath, {}, getValidAccessToken());
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
    loadHistory();
  }, [loadHistory]);

  return (
    <section className="audit-page">
      <header className="pos-header">
        <div>
          <p className="pos-eyebrow">Sales Records</p>
          <h1>Sales History</h1>
          {data?.label && <p className="pos-muted">Showing results for {data.label}</p>}
        </div>
      </header>

      <ReportPeriodFilter filter={filter} loading={loading} onApply={applyFilter} onChange={setFilter} />

      {error && <p className="error-text">{error}</p>}
      {loading && !data && <p className="pos-muted">Loading sales history…</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <h3>Period</h3>
              <p>{data.label}</p>
            </article>
            <article className="kpi-card">
              <h3>Sales Count</h3>
              <p>{data.summary.sales_count}</p>
            </article>
            <article className="kpi-card">
              <h3>Total Revenue</h3>
              <p>{formatMoney(data.summary.total_amount)}</p>
            </article>
          </div>

          <section className="audit-log-section">
            <h2>Completed Sales</h2>
            {!data.sales.length && <p className="pos-muted">No sales found for this period.</p>}
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Cashier</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.receipt_number}</td>
                    <td>{sale.processed_by_username}</td>
                    <td>{sale.payment_method}</td>
                    <td>{formatMoney(sale.amount, sale.currency)}</td>
                    <td>{new Date(sale.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </section>
  );
};

export default SalesHistoryPage;
